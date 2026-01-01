import type { AcademicTerm } from './advising';

export interface CourseAliasEntry {
  canonicalCourseCode: string; // e.g., "CYBR 330"
  aliases: string[]; // e.g., ["CSCD 330"]
  type: 'subject-transition' | 'cross-listed-subjects' | string;
  confidence?: 'high' | 'medium' | 'low' | string;
  notes?: string;
}

export interface CourseAliasMapFile {
  schemaVersion: number;
  updatedAt: string; // YYYY-MM-DD
  purpose: string;
  entries: CourseAliasEntry[];
}

export interface TermMeta {
  termCode: AcademicTerm;
  termDescription: string | null;
}

export interface SubjectMeta {
  subject: string; // raw Banner subject code (e.g., "CSCD")
  description: string | null; // Banner subjectDescription
}

export interface DepartmentTermMetric {
  termCode: AcademicTerm;
  subject: string;
  sections: number;
  capacity: number;
  enrollment: number;
  enrollmentPublished: boolean;
}

export interface CourseMeta {
  canonicalCourseCode: string; // canonical identity used for trend grouping
  canonicalSubject: string;
  courseNumber: string;
  titles: string[];
  aliases: string[];
}

export interface CourseTermMetric {
  termCode: AcademicTerm;
  canonicalCourseCode: string;
  codesUsed: string[]; // course codes observed in this term (e.g., ["CSCD 330"])
  titles: string[]; // titles observed in this term
  subjectsUsed: string[]; // subjects observed in this term (e.g., ["CSCD"])
  sections: number;
  capacity: number;
  enrollment: number;
  enrollmentPublished: boolean;
}

export interface TermTotals {
  termCode: AcademicTerm;
  sections: number;
  capacity: number;
  enrollment: number;
  enrollmentPublished: boolean;
}

export interface ScheduleTrendsDataset {
  schemaVersion: number;
  generatedAt: string; // ISO 8601
  source: {
    schedulesDir: string;
    files: number;
    rows: number;
  };
  terms: TermMeta[];
  subjects: SubjectMeta[];
  termTotals: TermTotals[];
  departmentTrends: DepartmentTermMetric[];
  courseAliases: CourseAliasEntry[];
  courses: CourseMeta[];
  courseTrends: CourseTermMetric[];
}

