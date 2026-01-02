import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { BannerCourse, BannerDataResponse } from '../src/types/schedule';

type BannerDataWithMeta = BannerDataResponse & { generatedAt?: unknown };

type TermScheduleManifest = {
  schemaVersion: 1;
  generatedAt: string;
  defaultTermCode: string | null;
  terms: Array<{
    termCode: string;
    termDescription: string | null;
    totalCount: number;
    generatedAt: string | null;
  }>;
};

const RAW_SCHEDULES_DIR = path.join(process.cwd(), 'data/schedules/raw');
const PROCESSED_SCHEDULES_DIR = path.join(process.cwd(), 'data/schedules/processed');
const PUBLIC_TERMS_DIR = path.join(process.cwd(), 'public/data/terms');
const PUBLIC_DEFAULT_SCHEDULE_PATH = path.join(process.cwd(), 'public/data/schedule.json');
const PUBLIC_TERMS_MANIFEST_PATH = path.join(PUBLIC_TERMS_DIR, 'index.json');

function safeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

function safeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseTimestamp(value: unknown): number | null {
  const text = safeString(value);
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime();
}

function scoreCourse(course: BannerCourse): number {
  const enrollment = safeNumber(course.enrollment);
  const maximumEnrollment = safeNumber(course.maximumEnrollment);

  const facultyCount = Array.isArray(course.faculty) ? course.faculty.length : 0;
  const meetingFacultyCount = Array.isArray(course.meetingsFaculty) ? course.meetingsFaculty.length : 0;
  const meetingWithTimes = (Array.isArray(course.meetingsFaculty) ? course.meetingsFaculty : []).reduce(
    (sum, meeting) => {
      const beginTime = safeString(meeting.meetingTime?.beginTime);
      const endTime = safeString(meeting.meetingTime?.endTime);
      if (beginTime && endTime) return sum + 1;
      return sum;
    },
    0
  );

  const hasTitle = safeString(course.courseTitle) ? 1 : 0;
  const hasScheduleType = safeString(course.scheduleTypeDescription) ? 1 : 0;
  const hasCampus = safeString(course.campusDescription) ? 1 : 0;
  const hasInstructionalMethod = safeString(course.instructionalMethodDescription) ? 1 : 0;

  const hasReportedEnrollment = enrollment > 0 ? 1 : 0;
  const hasCapacity = maximumEnrollment > 0 ? 1 : 0;

  return (
    hasReportedEnrollment * 1000 +
    hasCapacity * 50 +
    meetingWithTimes * 25 +
    meetingFacultyCount * 10 +
    facultyCount * 5 +
    hasTitle * 10 +
    hasScheduleType * 5 +
    hasCampus * 5 +
    hasInstructionalMethod * 5
  );
}

type CourseCandidate = {
  course: BannerCourse;
  score: number;
  sourceFile: string;
  sourceTimestampMs: number;
};

function pickBetterCourse(a: CourseCandidate, b: CourseCandidate): CourseCandidate {
  if (a.score !== b.score) return a.score > b.score ? a : b;
  if (a.sourceTimestampMs !== b.sourceTimestampMs) return a.sourceTimestampMs > b.sourceTimestampMs ? a : b;
  if (a.sourceFile !== b.sourceFile) return a.sourceFile < b.sourceFile ? a : b;
  return a;
}

function compareCoursesForStableOutput(a: BannerCourse, b: BannerCourse): number {
  return (
    a.term.localeCompare(b.term) ||
    a.subject.localeCompare(b.subject) ||
    a.courseNumber.localeCompare(b.courseNumber) ||
    a.courseReferenceNumber.localeCompare(b.courseReferenceNumber)
  );
}

function getCurrentTermCode(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (month >= 9) return `${year}40`;
  if (month >= 7) return `${year}30`;
  if (month >= 4) return `${year}20`;
  return `${year}10`;
}

function parseBannerData(text: string, filePath: string): BannerDataWithMeta | null {
  try {
    const parsed = JSON.parse(text) as BannerDataWithMeta;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.data)) return null;
    return parsed;
  } catch (error) {
    console.warn(
      `Skipping invalid JSON: ${filePath}`,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

async function buildTermSchedule(termCode: string): Promise<{
  data: BannerCourse[];
  termDescription: string | null;
  generatedAt: string | null;
  sourceFiles: string[];
  mismatchedRows: number;
}> {
  const termDir = path.join(RAW_SCHEDULES_DIR, termCode);
  const entries = await readdir(termDir, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
    .map((entry) => entry.name)
    .filter((name) => name !== 'schedule.json')
    .sort();

  const candidatesBySection = new Map<string, CourseCandidate>();
  let maxSourceTimestampMs = 0;
  let mismatchedRows = 0;

  for (const fileName of jsonFiles) {
    const filePath = path.join(termDir, fileName);

    let fileStat;
    try {
      fileStat = await stat(filePath);
    } catch (error) {
      console.warn(`Skipping unreadable file: ${filePath}`, error instanceof Error ? error.message : error);
      continue;
    }

    const text = await readFile(filePath, 'utf8');
    const parsed = parseBannerData(text, filePath);
    if (!parsed) continue;

    const metaGeneratedAtMs = parseTimestamp(parsed.generatedAt);
    const sourceTimestampMs = metaGeneratedAtMs ?? fileStat.mtimeMs ?? 0;
    maxSourceTimestampMs = Math.max(maxSourceTimestampMs, sourceTimestampMs);

    for (const course of parsed.data) {
      if (!course || typeof course !== 'object') continue;
      if (course.term !== termCode) {
        mismatchedRows += 1;
        continue;
      }

      const crn = safeString(course.courseReferenceNumber);
      if (!crn) continue;

      const sectionKey = `${termCode}|${crn}`;
      const candidate: CourseCandidate = {
        course,
        score: scoreCourse(course),
        sourceFile: fileName,
        sourceTimestampMs,
      };

      const existing = candidatesBySection.get(sectionKey);
      if (!existing) {
        candidatesBySection.set(sectionKey, candidate);
        continue;
      }
      candidatesBySection.set(sectionKey, pickBetterCourse(existing, candidate));
    }
  }

  const data = Array.from(candidatesBySection.values())
    .map((entry) => entry.course)
    .sort(compareCoursesForStableOutput);

  const termDescription = data.map((c) => safeString(c.termDesc)).find((v) => v != null) ?? null;

  const generatedAt =
    maxSourceTimestampMs > 0 ? new Date(maxSourceTimestampMs).toISOString() : null;

  return {
    data,
    termDescription,
    generatedAt,
    sourceFiles: jsonFiles,
    mismatchedRows,
  };
}

async function main() {
  await mkdir(PUBLIC_TERMS_DIR, { recursive: true });

  const termDirents = await readdir(RAW_SCHEDULES_DIR, { withFileTypes: true });
  const terms = termDirents
    .filter((dirent) => dirent.isDirectory() && /^\d{6}$/.test(dirent.name))
    .map((dirent) => dirent.name)
    .sort();

  const manifestTerms: TermScheduleManifest['terms'] = [];

  for (const termCode of terms) {
    const result = await buildTermSchedule(termCode);

    if (result.mismatchedRows > 0) {
      console.warn(
        `Warning: ${result.mismatchedRows} rows in data/schedules/raw/${termCode}/ were skipped due to term mismatch.`
      );
    }

    const payload = {
      success: true,
      totalCount: result.data.length,
      generatedAt: result.generatedAt,
      sourceFiles: result.sourceFiles,
      data: result.data,
    } satisfies BannerDataResponse & { generatedAt: string | null; sourceFiles: string[] };

    const processedDir = path.join(PROCESSED_SCHEDULES_DIR, termCode);
    await mkdir(processedDir, { recursive: true });
    const termOutputPath = path.join(processedDir, 'schedule.json');
    await writeFile(termOutputPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

    const publicOutputPath = path.join(PUBLIC_TERMS_DIR, `${termCode}.json`);
    await writeFile(publicOutputPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

    manifestTerms.push({
      termCode,
      termDescription: result.termDescription,
      totalCount: result.data.length,
      generatedAt: result.generatedAt,
    });
  }

  const currentTerm = getCurrentTermCode();
  const defaultTermCode =
    manifestTerms.some((t) => t.termCode === currentTerm)
      ? currentTerm
      : (manifestTerms.at(-1)?.termCode ?? null);

  const manifest: TermScheduleManifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    defaultTermCode,
    terms: manifestTerms,
  };

  await writeFile(PUBLIC_TERMS_MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  if (defaultTermCode) {
    await copyFile(
      path.join(PUBLIC_TERMS_DIR, `${defaultTermCode}.json`),
      PUBLIC_DEFAULT_SCHEDULE_PATH
    );
  }

  const termLabel = defaultTermCode ? defaultTermCode : '(none)';
  console.log(`Built ${manifestTerms.length} term schedules. Default term: ${termLabel}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
