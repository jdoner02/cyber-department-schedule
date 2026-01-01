import type { BannerDataResponse, BannerCourse } from '../../types/schedule';

// Sample course for testing
export const mockBannerCourse: BannerCourse = {
  id: 283774,
  term: '202620',
  termDesc: 'Spring Quarter 2026',
  courseReferenceNumber: '21054',
  partOfTerm: '1',
  courseNumber: '110',
  courseDisplay: '110',
  subject: 'CSCD',
  subjectDescription: 'Computer Science',
  sequenceNumber: '001',
  campusDescription: 'Cheney',
  scheduleTypeDescription: 'Lecture w Practice/Discussion',
  courseTitle: 'INTRODUCTION TO PROGRAMMING',
  creditHours: null,
  maximumEnrollment: 40,
  enrollment: 35,
  seatsAvailable: 5,
  waitCapacity: 5,
  waitCount: 2,
  waitAvailable: 3,
  crossList: null,
  crossListCapacity: null,
  crossListCount: null,
  crossListAvailable: null,
  creditHourHigh: null,
  creditHourLow: 5,
  creditHourIndicator: null,
  openSection: true,
  linkIdentifier: null,
  isSectionLinked: false,
  subjectCourse: 'CSCD110',
  faculty: [
    {
      bannerId: '389',
      category: null,
      class: 'net.hedtech.banner.student.faculty.FacultyResultDecorator',
      courseReferenceNumber: '21054',
      displayName: 'Doe, Jane',
      emailAddress: 'jdoe@ewu.edu',
      primaryIndicator: true,
      term: '202620',
    },
  ],
  meetingsFaculty: [
    {
      category: '01',
      class: 'net.hedtech.banner.student.schedule.SectionSessionDecorator',
      courseReferenceNumber: '21054',
      faculty: [],
      meetingTime: {
        beginTime: '0800',
        endTime: '0850',
        building: 'CAT',
        buildingDescription: 'Computer & Engineering Building',
        campus: null,
        campusDescription: null,
        category: '01',
        class: 'net.hedtech.banner.general.overall.MeetingTimeDecorator',
        courseReferenceNumber: '21054',
        creditHourSession: 5.0,
        endDate: '06/12/2026',
        startDate: '03/30/2026',
        friday: true,
        hoursWeek: 4.17,
        meetingScheduleType: 'LPD',
        meetingType: 'CLAS',
        meetingTypeDescription: 'Class',
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        room: '221',
        saturday: false,
        sunday: false,
        term: '202620',
      },
      term: '202620',
    },
  ],
  reservedSeatSummary: null,
  sectionAttributes: [
    {
      class: 'net.hedtech.banner.student.schedule.SectionDegreeProgramAttributeDecorator',
      code: 'F011',
      courseReferenceNumber: '21054',
      description: 'State Support Funding',
      isZTCAttribute: false,
      termCode: '202620',
    },
  ],
  instructionalMethod: 'F2F',
  instructionalMethodDescription: 'Face-to-Face',
};

// Create a second course with overlapping time (same instructor) for conflict testing
export const mockConflictingCourse: BannerCourse = {
  ...mockBannerCourse,
  id: 283775,
  courseReferenceNumber: '21055',
  courseNumber: '211',
  courseTitle: 'DATA STRUCTURES',
  subjectCourse: 'CSCD211',
  meetingsFaculty: [
    {
      ...mockBannerCourse.meetingsFaculty[0],
      courseReferenceNumber: '21055',
      meetingTime: {
        ...mockBannerCourse.meetingsFaculty[0].meetingTime,
        courseReferenceNumber: '21055',
        beginTime: '0830', // Overlaps with 0800-0850
        endTime: '0920',
        room: '222',
      },
    },
  ],
};

// Course with no conflicts
export const mockNonConflictingCourse: BannerCourse = {
  ...mockBannerCourse,
  id: 283776,
  courseReferenceNumber: '21056',
  courseNumber: '300',
  courseTitle: 'ALGORITHMS',
  subjectCourse: 'CSCD300',
  faculty: [
    {
      ...mockBannerCourse.faculty[0],
      displayName: 'Smith, John',
      emailAddress: 'jsmith@ewu.edu',
      courseReferenceNumber: '21056',
    },
  ],
  meetingsFaculty: [
    {
      ...mockBannerCourse.meetingsFaculty[0],
      courseReferenceNumber: '21056',
      meetingTime: {
        ...mockBannerCourse.meetingsFaculty[0].meetingTime,
        courseReferenceNumber: '21056',
        beginTime: '1300', // No overlap - 1:00 PM
        endTime: '1350',
        room: '223',
      },
    },
  ],
};

// CYBR course
export const mockCybrCourse: BannerCourse = {
  ...mockBannerCourse,
  id: 283777,
  courseReferenceNumber: '21057',
  subject: 'CYBR',
  subjectDescription: 'Cybersecurity',
  courseNumber: '301',
  courseTitle: 'INTRODUCTION TO CYBERSECURITY',
  subjectCourse: 'CYBR301',
  meetingsFaculty: [
    {
      ...mockBannerCourse.meetingsFaculty[0],
      courseReferenceNumber: '21057',
      meetingTime: {
        ...mockBannerCourse.meetingsFaculty[0].meetingTime,
        courseReferenceNumber: '21057',
        beginTime: '1000',
        endTime: '1050',
        room: '224',
      },
    },
  ],
};

// Online course
export const mockOnlineCourse: BannerCourse = {
  ...mockBannerCourse,
  id: 283778,
  courseReferenceNumber: '21058',
  courseNumber: '202',
  courseTitle: 'COMPUTING ETHICS',
  subjectCourse: 'CSCD202',
  campusDescription: 'Online',
  instructionalMethod: 'ONL',
  instructionalMethodDescription: 'Online',
  meetingsFaculty: [
    {
      ...mockBannerCourse.meetingsFaculty[0],
      courseReferenceNumber: '21058',
      meetingTime: {
        ...mockBannerCourse.meetingsFaculty[0].meetingTime,
        courseReferenceNumber: '21058',
        beginTime: null,
        endTime: null,
        building: 'ARR',
        room: 'WEB',
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
      },
    },
  ],
};

export const mockScheduleResponse: BannerDataResponse = {
  success: true,
  totalCount: 5,
  data: [
    mockBannerCourse,
    mockConflictingCourse,
    mockNonConflictingCourse,
    mockCybrCourse,
    mockOnlineCourse,
  ],
};
