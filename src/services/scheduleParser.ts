import type {
  BannerCourse,
  BannerDataResponse,
  Course,
  SubjectCode,
  CampusType,
  DeliveryMethod,
  DayOfWeek,
  EnrollmentData,
  Instructor,
  Meeting,
  CourseAttribute,
} from '../types/schedule';
import { timeToMinutes } from '../constants/timeSlots';

/**
 * Parse Banner ERP JSON data into normalized Course objects
 */
export function parseScheduleData(response: BannerDataResponse): Course[] {
  if (!response.success || !response.data) {
    console.error('Invalid schedule data response');
    return [];
  }

  return response.data
    .map(parseCourse)
    .filter((course): course is Course => course !== null);
}

/**
 * Parse a single Banner course into a normalized Course object
 */
function parseCourse(bannerCourse: BannerCourse): Course | null {
  try {
    const instructor = parseInstructor(bannerCourse.faculty);
    const meetings = parseMeetings(bannerCourse.meetingsFaculty);
    const enrollment = parseEnrollment(bannerCourse);
    const attributes = parseAttributes(bannerCourse.sectionAttributes);

    return {
      id: bannerCourse.id.toString(),
      crn: bannerCourse.courseReferenceNumber,
      term: bannerCourse.term,
      termDescription: bannerCourse.termDesc,

      subject: normalizeSubject(bannerCourse.subject),
      subjectRaw: bannerCourse.subject,
      courseNumber: bannerCourse.courseNumber,
      title: bannerCourse.courseTitle,
      displayCode: `${bannerCourse.subject} ${bannerCourse.courseNumber}`,

      section: bannerCourse.sequenceNumber,
      campus: normalizeCampus(bannerCourse.campusDescription),
      campusRaw: bannerCourse.campusDescription,
      scheduleType: bannerCourse.scheduleTypeDescription,

      enrollment,
      instructor,
      meetings,

      delivery: normalizeDelivery(bannerCourse.instructionalMethod),
      deliveryDescription: bannerCourse.instructionalMethodDescription,
      credits: bannerCourse.creditHourLow ?? bannerCourse.creditHours ?? 0,

      attributes,
      isOpen: bannerCourse.openSection,
    };
  } catch (error) {
    console.error(`Error parsing course ${bannerCourse.courseReferenceNumber}:`, error);
    return null;
  }
}

/**
 * Normalize subject code to known types
 */
function normalizeSubject(subject: string): SubjectCode {
  const upperSubject = subject.toUpperCase();
  if (upperSubject === 'CSCD') return 'CSCD';
  if (upperSubject === 'CYBR') return 'CYBR';
  if (upperSubject === 'MATH') return 'MATH';
  return 'OTHER';
}

/**
 * Normalize campus description
 */
function normalizeCampus(campus: string): CampusType {
  const lowerCampus = campus.toLowerCase();
  if (lowerCampus.includes('cheney')) return 'Cheney';
  if (lowerCampus.includes('spokane') || lowerCampus.includes('u-district')) return 'Spokane U-District';
  if (lowerCampus.includes('online')) return 'Online';
  return 'Other';
}

/**
 * Normalize instructional method to delivery type
 */
function normalizeDelivery(method: string): DeliveryMethod {
  const upperMethod = method.toUpperCase();
  if (upperMethod === 'F2F') return 'F2F';
  if (upperMethod.includes('ONLINE') || upperMethod === 'ONL') return 'Online';
  if (upperMethod.includes('MIX') || upperMethod.includes('HYBRID')) return 'Hybrid';
  if (upperMethod === 'ARR' || upperMethod.includes('ARRANGE')) return 'Arranged';
  return 'F2F'; // Default to F2F
}

/**
 * Parse instructor from faculty array
 */
function parseInstructor(faculty: BannerCourse['faculty']): Instructor | null {
  if (!faculty || faculty.length === 0) return null;

  // Find primary instructor, or use first one
  const primary = faculty.find((f) => f.primaryIndicator) ?? faculty[0];

  // Parse name (format: "Last, First")
  const nameParts = primary.displayName.split(',').map((s) => s.trim());
  const lastName = nameParts[0] ?? '';
  const firstName = nameParts[1] ?? '';

  return {
    id: primary.bannerId,
    displayName: primary.displayName,
    firstName,
    lastName,
    email: primary.emailAddress,
    isPrimary: primary.primaryIndicator,
  };
}

/**
 * Parse meetings from meetingsFaculty array
 */
function parseMeetings(meetingsFaculty: BannerCourse['meetingsFaculty']): Meeting[] {
  if (!meetingsFaculty || meetingsFaculty.length === 0) return [];

  return meetingsFaculty
    .map((mf) => {
      const mt = mf.meetingTime;
      if (!mt) return null;

      // Extract days
      const days: DayOfWeek[] = [];
      if (mt.monday) days.push('monday');
      if (mt.tuesday) days.push('tuesday');
      if (mt.wednesday) days.push('wednesday');
      if (mt.thursday) days.push('thursday');
      if (mt.friday) days.push('friday');

      // Parse times
      const startMinutes = timeToMinutes(mt.beginTime);
      const endMinutes = timeToMinutes(mt.endTime);
      const durationMinutes = endMinutes - startMinutes;

      // Build location string
      let location = 'TBA';
      if (mt.building && mt.room) {
        location = `${mt.building} ${mt.room}`;
      } else if (mt.building) {
        location = mt.building;
      } else if (mt.room === 'WEB') {
        location = 'Online';
      }

      return {
        days,
        startTime: mt.beginTime ?? '',
        endTime: mt.endTime ?? '',
        startMinutes,
        endMinutes,
        durationMinutes,
        building: mt.building,
        room: mt.room,
        location,
        type: mt.meetingScheduleType,
        typeDescription: mt.meetingTypeDescription,
      };
    })
    .filter((m): m is Meeting => m !== null && m.days.length > 0);
}

/**
 * Parse enrollment data
 */
function parseEnrollment(course: BannerCourse): EnrollmentData {
  const current = course.enrollment ?? 0;
  const maximum = course.maximumEnrollment ?? 0;
  const available = course.seatsAvailable ?? 0;
  const utilizationPercent = maximum > 0 ? Math.round((current / maximum) * 100) : 0;

  return {
    current,
    maximum,
    available,
    waitlist: course.waitCount ?? 0,
    waitlistMax: course.waitCapacity ?? 0,
    utilizationPercent,
  };
}

/**
 * Parse section attributes
 */
function parseAttributes(attributes: BannerCourse['sectionAttributes']): CourseAttribute[] {
  if (!attributes || attributes.length === 0) return [];

  return attributes.map((attr) => ({
    code: attr.code,
    description: attr.description,
    isZTC: attr.isZTCAttribute,
  }));
}

/**
 * Get unique instructors from courses
 */
export function getUniqueInstructors(courses: Course[]): Instructor[] {
  const instructorMap = new Map<string, Instructor>();

  courses.forEach((course) => {
    if (course.instructor) {
      instructorMap.set(course.instructor.email, course.instructor);
    }
  });

  return Array.from(instructorMap.values()).sort((a, b) =>
    a.lastName.localeCompare(b.lastName)
  );
}

/**
 * Get unique subjects from courses
 */
export function getUniqueSubjects(courses: Course[]): SubjectCode[] {
  const subjects = new Set<SubjectCode>();
  courses.forEach((course) => subjects.add(course.subject));
  return Array.from(subjects).sort();
}

/**
 * Get unique campuses from courses
 */
export function getUniqueCampuses(courses: Course[]): CampusType[] {
  const campuses = new Set<CampusType>();
  courses.forEach((course) => campuses.add(course.campus));
  return Array.from(campuses);
}

/**
 * Filter courses by day
 */
export function filterCoursesByDay(courses: Course[], day: DayOfWeek): Course[] {
  return courses.filter((course) =>
    course.meetings.some((meeting) => meeting.days.includes(day))
  );
}

/**
 * Get courses that meet at a specific hour
 */
export function getCoursesAtHour(courses: Course[], day: DayOfWeek, hour: number): Course[] {
  const hourStart = hour * 60;
  const hourEnd = (hour + 1) * 60;

  return courses.filter((course) =>
    course.meetings.some((meeting) => {
      if (!meeting.days.includes(day)) return false;
      // Course overlaps with this hour if it starts before hour ends and ends after hour starts
      return meeting.startMinutes < hourEnd && meeting.endMinutes > hourStart;
    })
  );
}
