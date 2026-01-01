import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Loader2, TrendingUp, Search, Info } from 'lucide-react';
import type { ScheduleTrendsDataset } from '../types/trends';
import { loadScheduleTrendsFromPublic } from '../services/trends';
import { formatTerm } from '../constants/academicTerms';
import { useAcademicCalendarEvents } from '../contexts/AcademicCalendarContext';
import { findRegistrationOpensEvent } from '../services/academicCalendar';
import DrilldownModal from '../components/common/DrilldownModal';

type MetricKey = 'sections' | 'capacity' | 'enrollment' | 'fillRate';

const METRICS: Record<
  MetricKey,
  { label: string; format: (value: number) => string; valueLabel: string }
> = {
  sections: {
    label: 'Sections',
    valueLabel: 'Sections',
    format: (value) => new Intl.NumberFormat().format(value),
  },
  capacity: {
    label: 'Seats Offered',
    valueLabel: 'Seats offered',
    format: (value) => new Intl.NumberFormat().format(value),
  },
  enrollment: {
    label: 'Seats Filled',
    valueLabel: 'Seats filled',
    format: (value) => new Intl.NumberFormat().format(value),
  },
  fillRate: {
    label: 'Fill Rate',
    valueLabel: 'Fill rate',
    format: (value) => `${Math.round(value)}%`,
  },
};

function toPercent(enrollment: number, capacity: number): number | null {
  if (capacity <= 0) return null;
  return (enrollment / capacity) * 100;
}

export default function Trends() {
  const calendarEvents = useAcademicCalendarEvents();

  const [dataset, setDataset] = useState<ScheduleTrendsDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deptSubject, setDeptSubject] = useState<string>('ALL');
  const [deptMetric, setDeptMetric] = useState<MetricKey>('capacity');

  const [courseQuery, setCourseQuery] = useState('');
  const [selectedCourseCode, setSelectedCourseCode] = useState<string | null>(null);
  const [courseMetric, setCourseMetric] = useState<MetricKey>('capacity');
  const [drilldown, setDrilldown] = useState<
    | { kind: 'department'; termCode: string; termLabel: string; subject: string }
    | { kind: 'course'; termCode: string; termLabel: string; canonicalCourseCode: string }
    | null
  >(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    loadScheduleTrendsFromPublic()
      .then((data) => {
        if (!alive) return;
        setDataset(data);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Failed to load trends dataset');
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!dataset) return;

    // Default department
    const preferredDept = ['CYBR', 'CSCD'].find((s) => dataset.subjects.some((subj) => subj.subject === s));
    if (preferredDept) setDeptSubject(preferredDept);

    const preferredCourse = dataset.courses.find((c) => c.canonicalCourseCode === 'CYBR 330')
      ? 'CYBR 330'
      : dataset.courses[0]?.canonicalCourseCode ?? null;
    setSelectedCourseCode(preferredCourse);
  }, [dataset]);

  const termLabelByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const term of dataset?.terms ?? []) {
      map.set(term.termCode, formatTerm(term.termCode));
    }
    return map;
  }, [dataset?.terms]);

  const registrationOpensByTerm = useMemo(() => {
    const map = new Map<string, Date>();
    if (!dataset) return map;
    for (const term of dataset.terms) {
      const event = findRegistrationOpensEvent(calendarEvents, term.termCode);
      if (!event) continue;
      const date = new Date(event.startDate);
      if (!Number.isNaN(date.getTime())) map.set(term.termCode, date);
    }
    return map;
  }, [calendarEvents, dataset]);

  const deptMetricByKey = useMemo(() => {
    if (!dataset) return new Map<string, ScheduleTrendsDataset['departmentTrends'][number]>();
    return new Map(dataset.departmentTrends.map((row) => [`${row.termCode}|${row.subject}`, row]));
  }, [dataset]);

  const totalsByTerm = useMemo(() => {
    if (!dataset) return new Map<string, ScheduleTrendsDataset['termTotals'][number]>();
    return new Map(dataset.termTotals.map((row) => [row.termCode, row]));
  }, [dataset]);

  const departmentSeries = useMemo(() => {
    if (!dataset) return [];
    return dataset.terms.map((term) => {
      const label = termLabelByCode.get(term.termCode) ?? term.termCode;

      if (deptSubject === 'ALL') {
        const totals = totalsByTerm.get(term.termCode);
        const enrollmentPublished = totals?.enrollmentPublished ?? false;
        const sections = totals?.sections ?? 0;
        const capacity = totals?.capacity ?? 0;
        const enrollment = totals?.enrollment ?? 0;
        const fillRate = enrollmentPublished ? toPercent(enrollment, capacity) : null;

        return {
          termCode: term.termCode,
          termLabel: label,
          sections,
          capacity,
          enrollment: enrollmentPublished ? enrollment : null,
          fillRate,
          enrollmentPublished,
        };
      }

      const row = deptMetricByKey.get(`${term.termCode}|${deptSubject}`);
      const enrollmentPublished = row?.enrollmentPublished ?? false;
      const sections = row?.sections ?? 0;
      const capacity = row?.capacity ?? 0;
      const enrollment = row?.enrollment ?? 0;
      const fillRate = enrollmentPublished ? toPercent(enrollment, capacity) : null;

      return {
        termCode: term.termCode,
        termLabel: label,
        sections,
        capacity,
        enrollment: enrollmentPublished ? enrollment : null,
        fillRate,
        enrollmentPublished,
      };
    });
  }, [dataset, deptMetricByKey, deptSubject, termLabelByCode, totalsByTerm]);

  const selectedCourseMeta = useMemo(() => {
    if (!dataset || !selectedCourseCode) return null;
    return dataset.courses.find((c) => c.canonicalCourseCode === selectedCourseCode) ?? null;
  }, [dataset, selectedCourseCode]);

  const selectedCourseAliasEntry = useMemo(() => {
    if (!dataset || !selectedCourseCode) return null;
    return dataset.courseAliases.find((e) => e.canonicalCourseCode.toUpperCase() === selectedCourseCode.toUpperCase()) ?? null;
  }, [dataset, selectedCourseCode]);

  const courseMetricsByTerm = useMemo(() => {
    const map = new Map<string, ScheduleTrendsDataset['courseTrends'][number]>();
    if (!dataset || !selectedCourseCode) return map;
    for (const row of dataset.courseTrends) {
      if (row.canonicalCourseCode !== selectedCourseCode) continue;
      map.set(row.termCode, row);
    }
    return map;
  }, [dataset, selectedCourseCode]);

  const courseSeries = useMemo(() => {
    if (!dataset || !selectedCourseCode) return [];
    return dataset.terms.map((term) => {
      const label = termLabelByCode.get(term.termCode) ?? term.termCode;
      const row = courseMetricsByTerm.get(term.termCode);
      const sections = row?.sections ?? 0;
      const capacity = row?.capacity ?? 0;
      const enrollmentPublished = row?.enrollmentPublished ?? false;
      const enrollmentRaw = row?.enrollment ?? 0;
      const enrollment = enrollmentPublished ? enrollmentRaw : null;
      const fillRate = enrollmentPublished ? toPercent(enrollmentRaw, capacity) : null;

      return {
        termCode: term.termCode,
        termLabel: label,
        sections,
        capacity,
        enrollment,
        fillRate,
        enrollmentPublished,
        codesUsed: row?.codesUsed ?? [],
      };
    });
  }, [courseMetricsByTerm, dataset, selectedCourseCode, termLabelByCode]);

  const departmentBreakdownForTerm = useMemo(() => {
    const map = new Map<string, ScheduleTrendsDataset['departmentTrends']>();
    if (!dataset) return map;

    for (const row of dataset.departmentTrends) {
      const list = map.get(row.termCode) ?? [];
      list.push(row);
      map.set(row.termCode, list);
    }

    for (const list of map.values()) {
      list.sort((a, b) => b.sections - a.sections || a.subject.localeCompare(b.subject));
    }

    return map;
  }, [dataset]);

  const courseSearchResults = useMemo(() => {
    if (!dataset) return [];
    const q = courseQuery.trim().toUpperCase();
    if (q.length === 0) return [];

    const scored = dataset.courses
      .map((course) => {
        const code = course.canonicalCourseCode.toUpperCase();
        const aliases = course.aliases.map((a) => a.toUpperCase());
        const titles = course.titles.map((t) => t.toUpperCase());

        let score = 0;
        if (code === q) score += 100;
        if (code.startsWith(q)) score += 50;
        if (code.includes(q)) score += 25;
        if (aliases.some((a) => a === q)) score += 60;
        if (aliases.some((a) => a.includes(q))) score += 20;
        if (titles.some((t) => t.includes(q))) score += 10;

        return { course, score };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.course.canonicalCourseCode.localeCompare(b.course.canonicalCourseCode))
      .slice(0, 12);

    return scored.map((row) => row.course);
  }, [courseQuery, dataset]);

  const selectedMetric = METRICS[deptMetric];
  const selectedCourseMetric = METRICS[courseMetric];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-ewu-red mx-auto mb-4" />
          <p className="text-gray-600">Loading trends…</p>
        </div>
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <div className="text-red-600 mb-3 font-semibold">Unable to load trends</div>
        <div className="text-red-700 text-sm">{error ?? 'No dataset loaded'}</div>
        <div className="text-xs text-red-600 mt-3">
          Generate it with <code className="font-mono">npm run build:trends</code>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quarterly Trends</h1>
          <p className="text-sm text-gray-600 mt-1">
            {dataset.terms.length} terms • {dataset.subjects.length} departments • {dataset.source.rows} sections
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <TrendingUp className="w-4 h-4" />
          <span className="hidden sm:inline">Generated</span>
          <span>{new Date(dataset.generatedAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Department trends */}
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
	            <div>
	              <h2 className="font-semibold text-gray-900">Department Trends</h2>
	              <p className="text-sm text-gray-600">Compare quarters for any department (or all departments combined).</p>
	              <p className="text-xs text-gray-500 mt-1">Tip: click a point to drill down into that term.</p>
	            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={deptSubject}
                onChange={(e) => setDeptSubject(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
                aria-label="Select department"
              >
                <option value="ALL">All departments (total)</option>
                {dataset.subjects.map((s) => (
                  <option key={s.subject} value={s.subject}>
                    {s.subject}{s.description ? ` — ${s.description}` : ''}
                  </option>
                ))}
              </select>

              <select
                value={deptMetric}
                onChange={(e) => setDeptMetric(e.target.value as MetricKey)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
                aria-label="Select metric"
              >
                {(Object.keys(METRICS) as MetricKey[]).map((key) => (
                  <option key={key} value={key}>
                    {METRICS[key].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card-body">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={departmentSeries}
                onClick={(state) => {
                  const activePayload = (
                    state as { activePayload?: Array<{ payload?: unknown }> }
                  ).activePayload;
                  const row = activePayload?.[0]?.payload as (typeof departmentSeries)[number] | undefined;
                  if (!row) return;
                  setDrilldown({
                    kind: 'department',
                    termCode: row.termCode,
                    termLabel: row.termLabel,
                    subject: deptSubject,
                  });
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="termLabel" tick={{ fontSize: 12 }} interval={0} angle={-20} height={55} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const row = payload[0].payload as (typeof departmentSeries)[number];
                    const reg = registrationOpensByTerm.get(row.termCode);
                    const regLabel = reg
                      ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(reg)
                      : null;
                    const isBefore = reg ? new Date().getTime() < reg.getTime() : false;

                    const value = row[deptMetric] as number | null;
                    const secondaryFillRate = toPercent(row.enrollmentPublished ? (row.enrollment ?? 0) : 0, row.capacity ?? 0);

                    return (
                      <div className="bg-white p-3 shadow-lg rounded-lg border">
                        <div className="font-medium text-gray-900">{row.termLabel}</div>
                        <div className="text-sm text-gray-700 mt-1">
                          {selectedMetric.valueLabel}:{' '}
                          <span className="font-medium">
                            {value === null ? '—' : selectedMetric.format(value)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-2 space-y-0.5">
                          <div>Sections: {row.sections}</div>
                          <div>Seats offered: {new Intl.NumberFormat().format(row.capacity)}</div>
                          <div>
                            Seats filled:{' '}
                            {row.enrollmentPublished ? new Intl.NumberFormat().format(row.enrollment ?? 0) : '—'}
                          </div>
                          <div>
                            Fill rate:{' '}
                            {row.enrollmentPublished && secondaryFillRate !== null ? `${Math.round(secondaryFillRate)}%` : '—'}
                          </div>
                          {!row.enrollmentPublished && (
                            <div className="text-blue-700 mt-1">
                              {regLabel && isBefore
                                ? `Enrollment not expected yet (registration opens ${regLabel}).`
                                : 'Enrollment not published in this snapshot.'}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">Click to drill down.</div>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={deptMetric}
                  stroke="#A4232E"
                  strokeWidth={2.5}
                  dot={(props) => {
                    const cx = typeof props.cx === 'number' ? props.cx : 0;
                    const cy = typeof props.cy === 'number' ? props.cy : 0;
                    const row = props.payload as (typeof departmentSeries)[number] | undefined;
                    if (!row || props.cx == null || props.cy == null || props.value == null) {
                      return <circle cx={cx} cy={cy} r={0} fill="transparent" style={{ pointerEvents: 'none' }} />;
                    }

                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="#A4232E"
                        stroke="#fff"
                        strokeWidth={1}
                        style={{ cursor: 'pointer' }}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDrilldown({
                            kind: 'department',
                            termCode: row.termCode,
                            termLabel: row.termLabel,
                            subject: deptSubject,
                          });
                        }}
                      />
                    );
                  }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Course trends */}
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
	            <div>
	              <h2 className="font-semibold text-gray-900">Course Trends (Canonical Identity)</h2>
	              <p className="text-sm text-gray-600">
	                Tracks a course across historical subject codes (e.g., <span className="font-medium">CSCD 330</span> →{' '}
	                <span className="font-medium">CYBR 330</span>) using an explicit alias map.
	              </p>
	              <p className="text-xs text-gray-500 mt-1">Tip: click a point (or a term row) to drill down.</p>
	            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={courseMetric}
                onChange={(e) => setCourseMetric(e.target.value as MetricKey)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
                aria-label="Select course metric"
              >
                {(Object.keys(METRICS) as MetricKey[]).map((key) => (
                  <option key={key} value={key}>
                    {METRICS[key].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card-body space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              value={courseQuery}
              onChange={(e) => setCourseQuery(e.target.value)}
              placeholder="Search course code, alias, or title (e.g., “330”, “CSCD 330”, “NETWORKS”)"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm"
            />
            {courseSearchResults.length > 0 && (
              <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {courseSearchResults.map((course) => (
                  <button
                    key={course.canonicalCourseCode}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50"
                    onClick={() => {
                      setSelectedCourseCode(course.canonicalCourseCode);
                      setCourseQuery('');
                    }}
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {course.canonicalCourseCode}{course.titles[0] ? ` — ${course.titles[0]}` : ''}
                    </div>
                    {course.aliases.length > 0 && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        Aliases: {course.aliases.join(', ')}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected course summary */}
          {selectedCourseMeta && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900">
                    {selectedCourseMeta.canonicalCourseCode}
                    {selectedCourseMeta.titles[0] ? ` — ${selectedCourseMeta.titles[0]}` : ''}
                  </div>
                  {selectedCourseMeta.aliases.length > 0 && (
                    <div className="text-sm text-gray-700 mt-1">
                      Historical / cross-listed codes: <span className="font-medium">{selectedCourseMeta.aliases.join(', ')}</span>
                    </div>
                  )}
                  {selectedCourseAliasEntry?.notes && (
                    <div className="text-sm text-gray-700 mt-1">{selectedCourseAliasEntry.notes}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={courseSeries}
                onClick={(state) => {
                  const activePayload = (
                    state as { activePayload?: Array<{ payload?: unknown }> }
                  ).activePayload;
                  const row = activePayload?.[0]?.payload as (typeof courseSeries)[number] | undefined;
                  if (!row || !selectedCourseCode) return;
                  setDrilldown({
                    kind: 'course',
                    termCode: row.termCode,
                    termLabel: row.termLabel,
                    canonicalCourseCode: selectedCourseCode,
                  });
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="termLabel" tick={{ fontSize: 12 }} interval={0} angle={-20} height={55} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const row = payload[0].payload as (typeof courseSeries)[number];
                    const reg = registrationOpensByTerm.get(row.termCode);
                    const regLabel = reg
                      ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(reg)
                      : null;
                    const isBefore = reg ? new Date().getTime() < reg.getTime() : false;

                    const value = row[courseMetric] as number | null;

                    return (
                      <div className="bg-white p-3 shadow-lg rounded-lg border">
                        <div className="font-medium text-gray-900">{row.termLabel}</div>
                        <div className="text-sm text-gray-700 mt-1">
                          {selectedCourseMetric.valueLabel}:{' '}
                          <span className="font-medium">
                            {value === null ? '—' : selectedCourseMetric.format(value)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-2 space-y-0.5">
                          <div>Sections: {row.sections}</div>
                          <div>Seats offered: {new Intl.NumberFormat().format(row.capacity)}</div>
                          <div>Seats filled: {row.enrollmentPublished ? new Intl.NumberFormat().format(row.enrollment ?? 0) : '—'}</div>
                          <div>
                            Codes in snapshot:{' '}
                            {row.codesUsed.length > 0 ? row.codesUsed.join(', ') : '—'}
                          </div>
                          {!row.enrollmentPublished && row.sections > 0 && (
                            <div className="text-blue-700 mt-1">
                              {regLabel && isBefore
                                ? `Enrollment not expected yet (registration opens ${regLabel}).`
                                : 'Enrollment not published in this snapshot.'}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">Click to drill down.</div>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={courseMetric}
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  dot={(props) => {
                    const cx = typeof props.cx === 'number' ? props.cx : 0;
                    const cy = typeof props.cy === 'number' ? props.cy : 0;
                    const row = props.payload as (typeof courseSeries)[number] | undefined;
                    if (!row || props.cx == null || props.cy == null || props.value == null) {
                      return <circle cx={cx} cy={cy} r={0} fill="transparent" style={{ pointerEvents: 'none' }} />;
                    }

                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="#2563EB"
                        stroke="#fff"
                        strokeWidth={1}
                        style={{ cursor: 'pointer' }}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!selectedCourseCode) return;
                          setDrilldown({
                            kind: 'course',
                            termCode: row.termCode,
                            termLabel: row.termLabel,
                            canonicalCourseCode: selectedCourseCode,
                          });
                        }}
                      />
                    );
                  }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Term-by-term table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Term</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Code(s) in snapshot</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Sections</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Seats offered</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Seats filled</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Fill rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
	                {courseSeries.map((row) => {
	                  const fillRate = row.enrollmentPublished && row.enrollment !== null ? toPercent(row.enrollment, row.capacity) : null;
	                  const showEnrollment = row.enrollmentPublished && row.enrollment !== null;
	                  return (
	                    <tr key={row.termCode} className="hover:bg-gray-50">
	                      <td className="px-4 py-3 whitespace-nowrap text-gray-900">
	                        {selectedCourseCode ? (
	                          <button
	                            onClick={() =>
	                              setDrilldown({
	                                kind: 'course',
	                                termCode: row.termCode,
	                                termLabel: row.termLabel,
	                                canonicalCourseCode: selectedCourseCode,
	                              })
	                            }
	                            className="text-blue-700 hover:underline font-medium"
	                          >
	                            {row.termLabel}
	                          </button>
	                        ) : (
	                          row.termLabel
	                        )}
	                      </td>
	                      <td className="px-4 py-3 text-gray-700">
	                        {row.codesUsed.length > 0 ? row.codesUsed.join(', ') : <span className="text-gray-400">—</span>}
	                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">{row.sections}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{new Intl.NumberFormat().format(row.capacity)}</td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {showEnrollment ? new Intl.NumberFormat().format(row.enrollment ?? 0) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {fillRate !== null ? (
                          <span className="font-medium">{`${Math.round(fillRate)}%`}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
	        </div>
	      </div>

	      <DrilldownModal
	        isOpen={drilldown !== null}
	        title={
	          drilldown
	            ? drilldown.kind === 'department'
	              ? `Term Drilldown: ${drilldown.termLabel}`
	              : `Course Drilldown: ${drilldown.canonicalCourseCode} (${drilldown.termLabel})`
	            : ''
	        }
	        description={
	          drilldown?.kind === 'department'
	            ? 'Click a subject row to focus the chart.'
	            : 'Shows what codes/titles appeared for this canonical course in the selected term.'
	        }
	        onClose={() => setDrilldown(null)}
	        maxWidthClassName="max-w-5xl"
	      >
	        {drilldown && (
	          <div className="space-y-6">
	            {(() => {
	              const reg = registrationOpensByTerm.get(drilldown.termCode);
	              const regLabel = reg
	                ? new Intl.DateTimeFormat(undefined, {
	                    year: 'numeric',
	                    month: 'short',
	                    day: 'numeric',
	                  }).format(reg)
	                : null;
	              const isBefore = reg ? new Date().getTime() < reg.getTime() : false;

	              if (drilldown.kind === 'department') {
	                const totals = totalsByTerm.get(drilldown.termCode) ?? null;
	                const enrollmentPublished = totals?.enrollmentPublished ?? false;
	                const fillRate =
	                  totals && enrollmentPublished ? toPercent(totals.enrollment, totals.capacity) : null;
	                const rows = departmentBreakdownForTerm.get(drilldown.termCode) ?? [];

	                return (
	                  <>
	                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
	                      <div className="text-center p-3 bg-gray-50 rounded-lg">
	                        <div className="text-2xl font-bold text-gray-900">{drilldown.termCode}</div>
	                        <div className="text-xs text-gray-500 uppercase tracking-wider">Term Code</div>
	                      </div>
	                      <div className="text-center p-3 bg-gray-50 rounded-lg">
	                        <div className="text-2xl font-bold text-gray-900">
	                          {totals ? totals.sections : '—'}
	                        </div>
	                        <div className="text-xs text-gray-500 uppercase tracking-wider">Sections</div>
	                      </div>
	                      <div className="text-center p-3 bg-gray-50 rounded-lg">
	                        <div className="text-2xl font-bold text-gray-900">
	                          {totals ? new Intl.NumberFormat().format(totals.capacity) : '—'}
	                        </div>
	                        <div className="text-xs text-gray-500 uppercase tracking-wider">Seats Offered</div>
	                      </div>
	                      <div className="text-center p-3 bg-gray-50 rounded-lg">
	                        <div className="text-2xl font-bold text-gray-900">
	                          {enrollmentPublished && totals
	                            ? new Intl.NumberFormat().format(totals.enrollment)
	                            : '—'}
	                        </div>
	                        <div className="text-xs text-gray-500 uppercase tracking-wider">Seats Filled</div>
	                      </div>
	                      <div className="md:col-span-4 text-sm text-gray-600">
	                        Fill rate:{' '}
	                        <span className="font-medium text-gray-900">
	                          {fillRate !== null ? `${Math.round(fillRate)}%` : '—'}
	                        </span>
	                        {regLabel ? (
	                          <span className="text-gray-500"> • Registration opens {regLabel}</span>
	                        ) : null}
	                      </div>
	                      {!enrollmentPublished && (
	                        <div className="md:col-span-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
	                          <div className="flex items-start gap-3">
	                            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
	                            <div className="text-sm text-blue-800">
	                              {regLabel && isBefore
	                                ? `Enrollment not expected yet (registration opens ${regLabel}).`
	                                : 'Enrollment not published in this snapshot.'}
	                            </div>
	                          </div>
	                        </div>
	                      )}
	                    </div>

	                    <div>
	                      <div className="flex items-end justify-between gap-3 mb-3">
	                        <div>
	                          <h3 className="font-semibold text-gray-900">Subject Breakdown</h3>
	                          <p className="text-sm text-gray-600">
	                            Current chart focus:{' '}
	                            <span className="font-medium text-gray-900">{drilldown.subject}</span>
	                          </p>
	                        </div>
	                        <button
	                          onClick={() => setDeptSubject('ALL')}
	                          className="btn btn-secondary"
	                          title="Show all departments in the chart"
	                        >
	                          Reset chart to ALL
	                        </button>
	                      </div>

	                      <div className="overflow-x-auto border border-gray-200 rounded-lg">
	                        <table className="w-full text-sm">
	                          <thead className="bg-gray-50">
	                            <tr>
	                              <th className="px-4 py-3 text-left font-medium text-gray-600">Subject</th>
	                              <th className="px-4 py-3 text-right font-medium text-gray-600">Sections</th>
	                              <th className="px-4 py-3 text-right font-medium text-gray-600">Seats offered</th>
	                              <th className="px-4 py-3 text-right font-medium text-gray-600">Seats filled</th>
	                              <th className="px-4 py-3 text-right font-medium text-gray-600">Fill rate</th>
	                            </tr>
	                          </thead>
	                          <tbody className="divide-y divide-gray-200">
	                            {rows.map((row) => {
	                              const rowFillRate = row.enrollmentPublished
	                                ? toPercent(row.enrollment, row.capacity)
	                                : null;

	                              return (
	                                <tr key={row.subject} className="hover:bg-gray-50">
	                                  <td className="px-4 py-3 whitespace-nowrap">
	                                    <button
	                                      onClick={() => {
	                                        setDeptSubject(row.subject);
	                                        setDrilldown(null);
	                                      }}
	                                      className="text-blue-700 hover:underline font-medium"
	                                      title="Focus this subject in the chart"
	                                    >
	                                      {row.subject}
	                                    </button>
	                                  </td>
	                                  <td className="px-4 py-3 text-right text-gray-900">{row.sections}</td>
	                                  <td className="px-4 py-3 text-right text-gray-900">
	                                    {new Intl.NumberFormat().format(row.capacity)}
	                                  </td>
	                                  <td className="px-4 py-3 text-right text-gray-900">
	                                    {row.enrollmentPublished ? (
	                                      new Intl.NumberFormat().format(row.enrollment)
	                                    ) : (
	                                      <span className="text-gray-400">—</span>
	                                    )}
	                                  </td>
	                                  <td className="px-4 py-3 text-right text-gray-900">
	                                    {rowFillRate !== null ? (
	                                      <span className="font-medium">{`${Math.round(rowFillRate)}%`}</span>
	                                    ) : (
	                                      <span className="text-gray-400">—</span>
	                                    )}
	                                  </td>
	                                </tr>
	                              );
	                            })}

	                            {rows.length === 0 && (
	                              <tr>
	                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
	                                  No subject breakdown rows were found for this term.
	                                </td>
	                              </tr>
	                            )}
	                          </tbody>
	                        </table>
	                      </div>
	                    </div>
	                  </>
	                );
	              }

	              const courseTermMetric =
	                dataset.courseTrends.find(
	                  (row) =>
	                    row.termCode === drilldown.termCode &&
	                    row.canonicalCourseCode === drilldown.canonicalCourseCode
	                ) ?? null;
	              const enrollmentPublished = courseTermMetric?.enrollmentPublished ?? false;
	              const fillRate =
	                courseTermMetric && enrollmentPublished
	                  ? toPercent(courseTermMetric.enrollment, courseTermMetric.capacity)
	                  : null;

	              const aliasEntry =
	                dataset.courseAliases.find(
	                  (entry) => entry.canonicalCourseCode === drilldown.canonicalCourseCode
	                ) ?? null;

	              return (
	                <>
	                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
	                    <div className="text-center p-3 bg-gray-50 rounded-lg">
	                      <div className="text-2xl font-bold text-gray-900">{drilldown.termCode}</div>
	                      <div className="text-xs text-gray-500 uppercase tracking-wider">Term Code</div>
	                    </div>
	                    <div className="text-center p-3 bg-gray-50 rounded-lg">
	                      <div className="text-2xl font-bold text-gray-900">
	                        {courseTermMetric ? courseTermMetric.sections : '—'}
	                      </div>
	                      <div className="text-xs text-gray-500 uppercase tracking-wider">Sections</div>
	                    </div>
	                    <div className="text-center p-3 bg-gray-50 rounded-lg">
	                      <div className="text-2xl font-bold text-gray-900">
	                        {courseTermMetric ? new Intl.NumberFormat().format(courseTermMetric.capacity) : '—'}
	                      </div>
	                      <div className="text-xs text-gray-500 uppercase tracking-wider">Seats Offered</div>
	                    </div>
	                    <div className="text-center p-3 bg-gray-50 rounded-lg">
	                      <div className="text-2xl font-bold text-gray-900">
	                        {enrollmentPublished && courseTermMetric
	                          ? new Intl.NumberFormat().format(courseTermMetric.enrollment)
	                          : '—'}
	                      </div>
	                      <div className="text-xs text-gray-500 uppercase tracking-wider">Seats Filled</div>
	                    </div>
	                    <div className="md:col-span-4 text-sm text-gray-600">
	                      Fill rate:{' '}
	                      <span className="font-medium text-gray-900">
	                        {fillRate !== null ? `${Math.round(fillRate)}%` : '—'}
	                      </span>
	                      {regLabel ? (
	                        <span className="text-gray-500"> • Registration opens {regLabel}</span>
	                      ) : null}
	                    </div>
	                  </div>

	                  {!enrollmentPublished && courseTermMetric && courseTermMetric.sections > 0 && (
	                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
	                      <div className="flex items-start gap-3">
	                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
	                        <div className="text-sm text-blue-800">
	                          {regLabel && isBefore
	                            ? `Enrollment not expected yet (registration opens ${regLabel}).`
	                            : 'Enrollment not published in this snapshot.'}
	                        </div>
	                      </div>
	                    </div>
	                  )}

	                  <div className="grid md:grid-cols-2 gap-4">
	                    <div className="p-4 bg-gray-50 rounded-lg">
	                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Codes observed</div>
	                      <div className="text-sm text-gray-900">
	                        {courseTermMetric?.codesUsed?.length ? courseTermMetric.codesUsed.join(', ') : <span className="text-gray-400">—</span>}
	                      </div>
	                    </div>
	                    <div className="p-4 bg-gray-50 rounded-lg">
	                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Subjects observed</div>
	                      <div className="text-sm text-gray-900">
	                        {courseTermMetric?.subjectsUsed?.length ? courseTermMetric.subjectsUsed.join(', ') : <span className="text-gray-400">—</span>}
	                      </div>
	                    </div>
	                    <div className="p-4 bg-gray-50 rounded-lg md:col-span-2">
	                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Titles observed</div>
	                      <div className="text-sm text-gray-900">
	                        {courseTermMetric?.titles?.length ? courseTermMetric.titles.join(' • ') : <span className="text-gray-400">—</span>}
	                      </div>
	                    </div>
	                  </div>

	                  {aliasEntry && (
	                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
	                      <div className="flex items-start gap-3">
	                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
	                        <div className="text-sm text-blue-900">
	                          <div className="font-medium">Alias mapping</div>
	                          <div className="mt-1">
	                            Aliases: {aliasEntry.aliases.length ? aliasEntry.aliases.join(', ') : '—'}
	                          </div>
	                          {aliasEntry.notes ? <div className="mt-1 text-blue-800">{aliasEntry.notes}</div> : null}
	                          <div className="mt-1 text-xs text-blue-700">
	                            Type: {aliasEntry.type}
	                            {aliasEntry.confidence ? ` • Confidence: ${aliasEntry.confidence}` : ''}
	                          </div>
	                        </div>
	                      </div>
	                    </div>
	                  )}
	                </>
	              );
	            })()}
	          </div>
	        )}
	      </DrilldownModal>
	    </div>
	  );
	}
