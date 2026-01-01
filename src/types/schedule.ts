// Banner ERP data types - raw data from JSON files
export interface BannerCourse {
  id: number;
  term: string;
  termDesc: string;
  courseReferenceNumber: string;
  partOfTerm: string;
  courseNumber: string;
  courseDisplay: string;
  subject: string;
  subjectDescription: string;
  sequenceNumber: string;
  campusDescription: string;
  scheduleTypeDescription: string;
  courseTitle: string;
  creditHours: number | null;
  creditHourLow: number | null;
  creditHourHigh: number | null;
  creditHourIndicator: string | null;
  maximumEnrollment: number;
  enrollment: number;
  seatsAvailable: number;
  waitCapacity: number;
  waitCount: number;
  waitAvailable: number;
  crossList: string | null;
  crossListCapacity: number | null;
  crossListCount: number | null;
  crossListAvailable: number | null;
  openSection: boolean;
  linkIdentifier: string | null;
  isSectionLinked: boolean;
  subjectCourse: string;
  faculty: BannerFaculty[];
  meetingsFaculty: BannerMeetingsFaculty[];
  reservedSeatSummary: string | null;
  sectionAttributes: BannerSectionAttribute[];
  instructionalMethod: string;
  instructionalMethodDescription: string;
}

export interface BannerFaculty {
  bannerId: string;
  category: string | null;
  class: string;
  courseReferenceNumber: string;
  displayName: string;
  emailAddress: string;
  primaryIndicator: boolean;
  term: string;
}

export interface BannerMeetingsFaculty {
  category: string;
  class: string;
  courseReferenceNumber: string;
  faculty: BannerFaculty[];
  meetingTime: BannerMeetingTime;
  term: string;
}

export interface BannerMeetingTime {
  beginTime: string | null;
  endTime: string | null;
  building: string | null;
  buildingDescription: string | null;
  campus: string | null;
  campusDescription: string | null;
  category: string;
  class: string;
  courseReferenceNumber: string;
  creditHourSession: number;
  endDate: string;
  startDate: string;
  friday: boolean;
  hoursWeek: number;
  meetingScheduleType: string;
  meetingType: string;
  meetingTypeDescription: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  saturday: boolean;
  sunday: boolean;
  room: string | null;
  term: string;
}

export interface BannerSectionAttribute {
  class: string;
  code: string;
  courseReferenceNumber: string;
  description: string;
  isZTCAttribute: boolean;
  termCode: string;
}

export interface BannerDataResponse {
  success: boolean;
  totalCount: number;
  data: BannerCourse[];
}

// Normalized application types
export type SubjectCode = 'CSCD' | 'CYBR' | 'MATH' | 'OTHER';
export type CampusType = 'Cheney' | 'Spokane U-District' | 'Online' | 'Other';
export type DeliveryMethod = 'F2F' | 'Online' | 'Hybrid' | 'Arranged';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export interface Course {
  id: string;
  crn: string;
  term: string;
  termDescription: string;

  subject: SubjectCode;
  subjectRaw: string;
  courseNumber: string;
  title: string;
  displayCode: string;

  section: string;
  campus: CampusType;
  campusRaw: string;
  scheduleType: string;

  enrollment: EnrollmentData;
  instructor: Instructor | null;
  meetings: Meeting[];

  delivery: DeliveryMethod;
  deliveryDescription: string;
  credits: number;

  attributes: CourseAttribute[];
  isOpen: boolean;
  hasConflicts?: boolean;
}

export interface EnrollmentData {
  current: number;
  maximum: number;
  available: number;
  waitlist: number;
  waitlistMax: number;
  utilizationPercent: number;
}

export interface Instructor {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  isPrimary: boolean;
}

export interface Meeting {
  days: DayOfWeek[];
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  building: string | null;
  room: string | null;
  location: string;
  type: string;
  typeDescription: string;
}

export interface CourseAttribute {
  code: string;
  description: string;
  isZTC: boolean;
}

// Grid display types
export interface TimeSlotData {
  hour: number;
  label: string;
  courses: Course[];
}

export interface DaySchedule {
  day: DayOfWeek;
  displayName: string;
  shortName: string;
  timeSlots: TimeSlotData[];
}

// Filter types
export interface ScheduleFilters {
  subjects: SubjectCode[];
  instructors: string[];
  days: DayOfWeek[];
  timeRange: { start: number; end: number };
  delivery: DeliveryMethod[];
  campus: CampusType[];
  showConflictsOnly: boolean;
  searchQuery: string;
}

export type ColorByOption = 'subject' | 'instructor' | 'delivery';
