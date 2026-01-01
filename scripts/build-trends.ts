import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { BannerCourse, BannerDataResponse } from '../src/types/schedule';
import type {
  CourseAliasMapFile,
  ScheduleTrendsDataset,
  CourseTermMetric,
  DepartmentTermMetric,
  CourseMeta,
  SubjectMeta,
  TermMeta,
  TermTotals,
} from '../src/types/trends';

const SCHEDULES_DIR = path.join(process.cwd(), 'data/schedules');
const COURSE_ALIAS_MAP_PATH = path.join(process.cwd(), 'data/catalog/mappings/course-aliases.json');

const OUTPUT_PATHS = [
  path.join(process.cwd(), 'data/trends/schedule-trends.json'),
  path.join(process.cwd(), 'public/data/trends/schedule-trends.json'),
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function decodeCommonEntities(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function normalizeTitle(value: string | null | undefined): string | null {
  if (!value) return null;
  return normalizeWhitespace(decodeCommonEntities(value));
}

function normalizeCourseCode(subject: string | null | undefined, courseNumber: string | null | undefined): string | null {
  if (!subject || !courseNumber) return null;
  const subj = normalizeWhitespace(subject).toUpperCase();
  const num = normalizeWhitespace(courseNumber).toUpperCase();
  return `${subj} ${num}`;
}

function parseCourseCode(courseCode: string): { subject: string; courseNumber: string } {
  const parts = normalizeWhitespace(courseCode).split(' ');
  const subject = parts[0]?.toUpperCase() ?? '';
  const courseNumber = parts.slice(1).join(' ').toUpperCase();
  return { subject, courseNumber };
}

function safeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

async function loadCourseAliasMap(): Promise<CourseAliasMapFile | null> {
  try {
    const text = await readFile(COURSE_ALIAS_MAP_PATH, 'utf8');
    return JSON.parse(text) as CourseAliasMapFile;
  } catch (error) {
    console.warn(`Course alias map not loaded (${COURSE_ALIAS_MAP_PATH}):`, error instanceof Error ? error.message : error);
    return null;
  }
}

function buildCanonicalMap(aliasMap: CourseAliasMapFile | null): Map<string, string> {
  const map = new Map<string, string>();
  const entries = aliasMap?.entries ?? [];

  for (const entry of entries) {
    const canonical = normalizeWhitespace(entry.canonicalCourseCode).toUpperCase();
    if (!canonical) continue;
    map.set(canonical, canonical);
    for (const alias of entry.aliases ?? []) {
      const key = normalizeWhitespace(alias).toUpperCase();
      if (!key) continue;
      map.set(key, canonical);
    }
  }

  return map;
}

async function listScheduleJsonFiles(): Promise<string[]> {
  const termDirents = await readdir(SCHEDULES_DIR, { withFileTypes: true });
  const files: string[] = [];

  for (const dirent of termDirents) {
    if (!dirent.isDirectory()) continue;
    const termDir = path.join(SCHEDULES_DIR, dirent.name);
    const entries = await readdir(termDir, { withFileTypes: true });

    // Prefer the monolithic schedule.json when present.
    const monolith = entries.find((entry) => entry.isFile() && entry.name === 'schedule.json');
    if (monolith) {
      files.push(path.join(termDir, monolith.name));
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.toLowerCase().endsWith('.json')) continue;
      files.push(path.join(termDir, entry.name));
    }
  }

  return files.sort();
}

function parseBannerData(text: string, filePath: string): BannerDataResponse | null {
  try {
    const parsed = JSON.parse(text) as BannerDataResponse;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray((parsed as BannerDataResponse).data)) return null;
    return parsed;
  } catch (error) {
    console.warn(`Skipping invalid JSON: ${filePath}`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function main() {
  const aliasMapFile = await loadCourseAliasMap();
  const canonicalMap = buildCanonicalMap(aliasMapFile);

  const scheduleFiles = await listScheduleJsonFiles();

  const termMetaMap = new Map<string, TermMeta>();
  const subjectMetaMap = new Map<string, SubjectMeta>();

  const termTotalsMap = new Map<string, TermTotals>();
  const departmentMap = new Map<string, DepartmentTermMetric>();
  const courseTermMap = new Map<string, CourseTermMetric>();
  const courseMetaMap = new Map<string, CourseMeta>();

  let rows = 0;
  let duplicates = 0;
  const seenSections = new Set<string>();

  for (const filePath of scheduleFiles) {
    const text = await readFile(filePath, 'utf8');
    const data = parseBannerData(text, filePath);
    if (!data) continue;

    const courses: BannerCourse[] = data.data ?? [];

    for (const course of courses) {
      const termCode = course.term;
      const crn = course.courseReferenceNumber;
      if (!termCode || !crn) continue;

      const sectionKey = `${termCode}|${crn}`;
      if (seenSections.has(sectionKey)) {
        duplicates += 1;
        continue;
      }
      seenSections.add(sectionKey);
      rows += 1;

      const termDescription = course.termDesc ? normalizeWhitespace(course.termDesc) : null;
      if (!termMetaMap.has(termCode)) {
        termMetaMap.set(termCode, { termCode, termDescription });
      }

      const subjectRaw = course.subject ? normalizeWhitespace(course.subject).toUpperCase() : null;
      if (!subjectRaw) continue;

      if (!subjectMetaMap.has(subjectRaw)) {
        subjectMetaMap.set(subjectRaw, {
          subject: subjectRaw,
          description: course.subjectDescription ? normalizeWhitespace(course.subjectDescription) : null,
        });
      }

      const courseCode = normalizeCourseCode(subjectRaw, course.courseNumber);
      if (!courseCode) continue;

      const canonicalCourseCode = canonicalMap.get(courseCode.toUpperCase()) ?? courseCode.toUpperCase();
      const { subject: canonicalSubject, courseNumber: canonicalCourseNumber } = parseCourseCode(canonicalCourseCode);

      const maximumEnrollment = safeNumber(course.maximumEnrollment);
      const enrollment = safeNumber(course.enrollment);

      // Term totals
      const totals = termTotalsMap.get(termCode) ?? {
        termCode,
        sections: 0,
        capacity: 0,
        enrollment: 0,
        enrollmentPublished: false,
      };
      totals.sections += 1;
      totals.capacity += maximumEnrollment;
      totals.enrollment += enrollment;
      if (enrollment > 0) totals.enrollmentPublished = true;
      termTotalsMap.set(termCode, totals);

      // Department trends (raw subject)
      const deptKey = `${termCode}|${subjectRaw}`;
      const dept = departmentMap.get(deptKey) ?? {
        termCode,
        subject: subjectRaw,
        sections: 0,
        capacity: 0,
        enrollment: 0,
        enrollmentPublished: false,
      };
      dept.sections += 1;
      dept.capacity += maximumEnrollment;
      dept.enrollment += enrollment;
      if (enrollment > 0) dept.enrollmentPublished = true;
      departmentMap.set(deptKey, dept);

      // Course meta (canonical)
      const meta = courseMetaMap.get(canonicalCourseCode) ?? {
        canonicalCourseCode,
        canonicalSubject,
        courseNumber: canonicalCourseNumber,
        titles: [],
        aliases: [],
      };
      const normalizedTitle = normalizeTitle(course.courseTitle);
      if (normalizedTitle && !meta.titles.includes(normalizedTitle)) {
        meta.titles.push(normalizedTitle);
      }
      courseMetaMap.set(canonicalCourseCode, meta);

      // Course term trend
      const courseTermKey = `${termCode}|${canonicalCourseCode}`;
      const ct = courseTermMap.get(courseTermKey) ?? {
        termCode,
        canonicalCourseCode,
        codesUsed: [],
        titles: [],
        subjectsUsed: [],
        sections: 0,
        capacity: 0,
        enrollment: 0,
        enrollmentPublished: false,
      };

      if (!ct.codesUsed.includes(courseCode)) ct.codesUsed.push(courseCode);
      if (!ct.subjectsUsed.includes(subjectRaw)) ct.subjectsUsed.push(subjectRaw);
      if (normalizedTitle && !ct.titles.includes(normalizedTitle)) ct.titles.push(normalizedTitle);

      ct.sections += 1;
      ct.capacity += maximumEnrollment;
      ct.enrollment += enrollment;
      if (enrollment > 0) ct.enrollmentPublished = true;
      courseTermMap.set(courseTermKey, ct);
    }
  }

  // Apply alias list from the mapping file onto course metas
  const aliasEntries = aliasMapFile?.entries ?? [];
  for (const entry of aliasEntries) {
    const canonical = normalizeWhitespace(entry.canonicalCourseCode).toUpperCase();
    if (!canonical) continue;
    const meta = courseMetaMap.get(canonical);
    if (!meta) continue;
    const merged = new Set<string>(meta.aliases.map((a) => a.toUpperCase()));
    for (const alias of entry.aliases ?? []) {
      const key = normalizeWhitespace(alias).toUpperCase();
      if (key) merged.add(key);
    }
    meta.aliases = Array.from(merged).sort();
    courseMetaMap.set(canonical, meta);
  }

  const terms = Array.from(termMetaMap.values()).sort((a, b) => Number(a.termCode) - Number(b.termCode));
  const subjects = Array.from(subjectMetaMap.values()).sort((a, b) => a.subject.localeCompare(b.subject));

  const termTotals = Array.from(termTotalsMap.values()).sort((a, b) => Number(a.termCode) - Number(b.termCode));

  const departmentTrends = Array.from(departmentMap.values()).sort((a, b) => {
    const termCmp = Number(a.termCode) - Number(b.termCode);
    if (termCmp !== 0) return termCmp;
    return a.subject.localeCompare(b.subject);
  });

  const courses = Array.from(courseMetaMap.values()).sort((a, b) => a.canonicalCourseCode.localeCompare(b.canonicalCourseCode));

  const courseTrends = Array.from(courseTermMap.values()).sort((a, b) => {
    const courseCmp = a.canonicalCourseCode.localeCompare(b.canonicalCourseCode);
    if (courseCmp !== 0) return courseCmp;
    return Number(a.termCode) - Number(b.termCode);
  });

  const dataset: ScheduleTrendsDataset = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      schedulesDir: 'data/schedules',
      files: scheduleFiles.length,
      rows,
    },
    terms,
    subjects,
    termTotals,
    departmentTrends,
    courseAliases: aliasEntries,
    courses,
    courseTrends,
  };

  const json = JSON.stringify(dataset, null, 2) + '\n';

  for (const outPath of OUTPUT_PATHS) {
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, json, 'utf8');
  }

  console.log(`Built schedule trends dataset from ${scheduleFiles.length} files (${rows} sections)`);
  if (duplicates > 0) {
    console.log(`  Skipped ${duplicates} duplicate sections across overlapping snapshot files`);
  }
  for (const outPath of OUTPUT_PATHS) {
    console.log(`  Wrote: ${path.relative(process.cwd(), outPath)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
