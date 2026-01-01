import type { Course, DeliveryMethod, Instructor, SubjectCode } from '../types/schedule';

export type EnrollmentDataStatus = 'none' | 'allZero' | 'available';

export interface TermSummary {
  code: string;
  description: string;
  courseCount: number;
}

export interface SubjectSummary {
  subject: SubjectCode;
  courseCount: number;
  enrollment: number;
  capacity: number;
  available: number;
}

export interface DeliverySummary {
  method: DeliveryMethod;
  courseCount: number;
}

export interface FacultyWorkloadSummary {
  name: string;
  fullName: string;
  courses: number;
  credits: number;
}

export interface TimeDistributionBucket {
  name: string;
  courses: number;
}

export interface ScheduleAnalytics {
  term: {
    primary: TermSummary | null;
    terms: TermSummary[];
    isMultiTerm: boolean;
  };
  enrollmentStatus: EnrollmentDataStatus;
  summary: {
    totalCourses: number;
    totalEnrollment: number;
    totalCapacity: number;
    totalCredits: number;
    utilizationRate: number;
    avgClassSize: number | null;
    instructorCount: number;
    coursesWithReportedEnrollment: number;
  };
  subjects: SubjectSummary[];
  delivery: DeliverySummary[];
  facultyWorkload: FacultyWorkloadSummary[];
  timeDistribution: TimeDistributionBucket[];
}

const DELIVERY_METHODS: DeliveryMethod[] = ['F2F', 'Online', 'Hybrid', 'Arranged'];

const TIME_BUCKETS: Array<{ name: string; startHour: number; endHour: number }> = [
  { name: '7-9 AM', startHour: 7, endHour: 9 },
  { name: '9-11 AM', startHour: 9, endHour: 11 },
  { name: '11 AM-1 PM', startHour: 11, endHour: 13 },
  { name: '1-3 PM', startHour: 13, endHour: 15 },
  { name: '3-5 PM', startHour: 15, endHour: 17 },
  { name: '5-7 PM', startHour: 17, endHour: 19 },
  { name: '7-9 PM', startHour: 19, endHour: 21 },
];

export function computeScheduleAnalytics({
  courses,
  instructors,
  subjects,
}: {
  courses: Course[];
  instructors: Instructor[];
  subjects: SubjectCode[];
}): ScheduleAnalytics {
  const totalCourses = courses.length;

  const termMap = new Map<string, TermSummary>();
  const subjectMap = new Map<SubjectCode, SubjectSummary>();
  const deliveryMap = new Map<DeliveryMethod, DeliverySummary>();
  const workloadMap = new Map<string, FacultyWorkloadSummary>();
  const timeDistribution: TimeDistributionBucket[] = TIME_BUCKETS.map((bucket) => ({
    name: bucket.name,
    courses: 0,
  }));

  subjects.forEach((subject) => {
    subjectMap.set(subject, {
      subject,
      courseCount: 0,
      enrollment: 0,
      capacity: 0,
      available: 0,
    });
  });

  DELIVERY_METHODS.forEach((method) => {
    deliveryMap.set(method, { method, courseCount: 0 });
  });

  let totalEnrollment = 0;
  let totalCapacity = 0;
  let totalCredits = 0;
  let coursesWithReportedEnrollment = 0;

  courses.forEach((course) => {
    // Term summary
    const existingTerm = termMap.get(course.term);
    if (existingTerm) {
      existingTerm.courseCount += 1;
    } else {
      termMap.set(course.term, {
        code: course.term,
        description: course.termDescription,
        courseCount: 1,
      });
    }

    // Enrollment summary
    totalEnrollment += course.enrollment.current;
    totalCapacity += course.enrollment.maximum;
    totalCredits += course.credits;
    if (course.enrollment.current > 0) coursesWithReportedEnrollment += 1;

    // Subject summary
    const subject = subjectMap.get(course.subject) ?? {
      subject: course.subject,
      courseCount: 0,
      enrollment: 0,
      capacity: 0,
      available: 0,
    };

    subject.courseCount += 1;
    subject.enrollment += course.enrollment.current;
    subject.capacity += course.enrollment.maximum;
    subject.available += course.enrollment.maximum - course.enrollment.current;
    subjectMap.set(course.subject, subject);

    // Delivery method summary
    const delivery = deliveryMap.get(course.delivery) ?? {
      method: course.delivery,
      courseCount: 0,
    };
    delivery.courseCount += 1;
    deliveryMap.set(course.delivery, delivery);

    // Faculty workload summary
    if (course.instructor) {
      const key = course.instructor.email;
      const existing = workloadMap.get(key) ?? {
        name: course.instructor.lastName,
        fullName: course.instructor.displayName,
        courses: 0,
        credits: 0,
      };
      existing.courses += 1;
      existing.credits += course.credits;
      workloadMap.set(key, existing);
    }

    // Time distribution summary (counts meetings, not unique sections)
    course.meetings.forEach((meeting) => {
      const startHour = Math.floor(meeting.startMinutes / 60);
      const bucketIndex = TIME_BUCKETS.findIndex(
        (bucket) => startHour >= bucket.startHour && startHour < bucket.endHour
      );
      if (bucketIndex !== -1) {
        timeDistribution[bucketIndex].courses += 1;
      }
    });
  });

  const terms = Array.from(termMap.values()).sort((a, b) => {
    if (b.courseCount !== a.courseCount) return b.courseCount - a.courseCount;
    return parseInt(b.code, 10) - parseInt(a.code, 10);
  });
  const primaryTerm = terms[0] ?? null;

  const enrollmentStatus: EnrollmentDataStatus =
    totalCourses === 0 ? 'none' : coursesWithReportedEnrollment === 0 ? 'allZero' : 'available';

  const utilizationRate =
    totalCapacity > 0 ? Math.round((totalEnrollment / totalCapacity) * 100) : 0;

  const avgClassSize =
    coursesWithReportedEnrollment > 0
      ? Math.round(totalEnrollment / coursesWithReportedEnrollment)
      : null;

  const subjectSummaries: SubjectSummary[] = [];
  const subjectsInOrder = subjects.length > 0 ? subjects : Array.from(subjectMap.keys()).sort();
  subjectsInOrder.forEach((subject) => {
    const summary = subjectMap.get(subject);
    if (summary) subjectSummaries.push(summary);
  });

  const deliverySummaries = Array.from(deliveryMap.values()).filter((d) => d.courseCount > 0);

  const facultyWorkload = Array.from(workloadMap.values())
    .filter((f) => f.courses > 0)
    .sort((a, b) => (b.courses !== a.courses ? b.courses - a.courses : b.credits - a.credits))
    .slice(0, 10);

  return {
    term: {
      primary: primaryTerm,
      terms,
      isMultiTerm: terms.length > 1,
    },
    enrollmentStatus,
    summary: {
      totalCourses,
      totalEnrollment,
      totalCapacity,
      totalCredits,
      utilizationRate,
      avgClassSize,
      instructorCount: instructors.length,
      coursesWithReportedEnrollment,
    },
    subjects: subjectSummaries,
    delivery: deliverySummaries,
    facultyWorkload,
    timeDistribution,
  };
}

