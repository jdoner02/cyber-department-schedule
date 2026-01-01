/**
 * =============================================================================
 * MODULE: Catalog Parser
 * =============================================================================
 *
 * PURPOSE: Load and parse degree program data from JSON files
 *
 * EDUCATIONAL NOTES:
 * - This service loads pre-scraped catalog data from JSON files
 * - Uses dynamic imports for code-splitting (programs load on demand)
 * - Implements caching to avoid repeated file reads
 *
 * DESIGN PATTERN: Repository Pattern
 * - Abstracts data access behind a clean interface
 * - The caller doesn't need to know about file paths or JSON parsing
 * - Easy to swap data source (could be API, localStorage, etc.)
 * =============================================================================
 */

import type { DegreeProgram, CourseRequirement } from '../types/advising';

// Cache for loaded programs
const programCache = new Map<string, DegreeProgram>();

// Index of available programs
const AVAILABLE_PROGRAMS: { slug: string; name: string; degreeType: string }[] = [
  { slug: 'computer-science-cyber-operations-bs', name: 'Computer Science - Cyber Operations, BS', degreeType: 'BS' },
  { slug: 'computer-science-bs', name: 'Computer Science, BS', degreeType: 'BS' },
  { slug: 'computer-science-bcs', name: 'Computer Science, BCS', degreeType: 'BCS' },
  { slug: 'cyber-operations-bs', name: 'Cyber Operations, BS', degreeType: 'BS' },
  { slug: 'cybersecurity-minor', name: 'Cybersecurity Minor', degreeType: 'Minor' },
  { slug: 'computer-science-ms', name: 'Computer Science, MS', degreeType: 'MS' },
];

/**
 * Load a degree program by its slug
 *
 * EDUCATIONAL NOTE - Dynamic Imports:
 * We use dynamic import() to load JSON files on demand.
 * This enables code-splitting - the program data isn't loaded
 * until it's actually needed, reducing initial bundle size.
 *
 * @param slug - Program slug (e.g., "computer-science-cyber-operations-bs")
 * @returns The degree program or null if not found
 */
export async function loadProgram(slug: string): Promise<DegreeProgram | null> {
  // Check cache first
  if (programCache.has(slug)) {
    return programCache.get(slug)!;
  }

  try {
    // Dynamic import of the JSON file
    // The path is relative to the build output
    const programModule = await import(`../data/catalog/programs/${slug}.json`);
    const program: DegreeProgram = programModule.default;

    // Validate the loaded data
    if (!isValidProgram(program)) {
      console.error(`Invalid program data for ${slug}`);
      return null;
    }

    // Cache for future requests
    programCache.set(slug, program);

    return program;
  } catch (error) {
    console.error(`Failed to load program ${slug}:`, error);
    return null;
  }
}

/**
 * Validate that loaded data matches expected structure
 *
 * EDUCATIONAL NOTE - Runtime Validation:
 * TypeScript types only exist at compile time. When loading
 * external data (JSON files, APIs), we need runtime checks
 * to ensure the data matches our expectations.
 */
function isValidProgram(data: unknown): data is DegreeProgram {
  if (!data || typeof data !== 'object') return false;

  const program = data as Record<string, unknown>;

  return (
    typeof program.slug === 'string' &&
    typeof program.name === 'string' &&
    typeof program.degreeType === 'string' &&
    Array.isArray(program.coreCourses)
  );
}

/**
 * Get list of all available programs
 *
 * @returns Array of program metadata (slug, name, type)
 */
export function getAvailablePrograms(): typeof AVAILABLE_PROGRAMS {
  return [...AVAILABLE_PROGRAMS];
}

/**
 * Get programs filtered by degree type
 *
 * @param degreeType - Type to filter by (BS, MS, Minor, etc.)
 * @returns Filtered list of programs
 */
export function getProgramsByType(degreeType: string): typeof AVAILABLE_PROGRAMS {
  return AVAILABLE_PROGRAMS.filter((p) => p.degreeType === degreeType);
}

/**
 * Load multiple programs at once
 *
 * EDUCATIONAL NOTE - Promise.all:
 * We load all programs in parallel using Promise.all.
 * This is much faster than loading them sequentially.
 *
 * @param slugs - Array of program slugs to load
 * @returns Map of slug to program (null entries filtered out)
 */
export async function loadPrograms(slugs: string[]): Promise<Map<string, DegreeProgram>> {
  const results = await Promise.all(slugs.map((slug) => loadProgram(slug)));

  const programMap = new Map<string, DegreeProgram>();
  slugs.forEach((slug, index) => {
    const program = results[index];
    if (program) {
      programMap.set(slug, program);
    }
  });

  return programMap;
}

/**
 * Get all courses from a program (flattened)
 *
 * EDUCATIONAL NOTE - Array Flattening:
 * A degree program has courses in multiple locations:
 * - coreCourses
 * - electiveGroups[].courses
 * - supportCourses
 *
 * This function collects them all into a single array.
 *
 * @param program - The degree program
 * @returns All courses in the program
 */
export function getAllProgramCourses(program: DegreeProgram): CourseRequirement[] {
  const courses: CourseRequirement[] = [...program.coreCourses, ...program.supportCourses];

  // Add courses from elective groups
  program.electiveGroups.forEach((group) => {
    courses.push(...group.courses);
  });

  return courses;
}

/**
 * Find a specific course in a program
 *
 * @param program - The degree program
 * @param courseCode - Course code to find (e.g., "CSCD 210")
 * @returns The course requirement or undefined
 */
export function findCourseInProgram(
  program: DegreeProgram,
  courseCode: string
): CourseRequirement | undefined {
  return getAllProgramCourses(program).find(
    (c) => c.courseCode.toLowerCase() === courseCode.toLowerCase()
  );
}

/**
 * Calculate total required credits for a program
 *
 * @param program - The degree program
 * @returns Total credits from all requirements
 */
export function calculateProgramCredits(program: DegreeProgram): number {
  let total = 0;

  // Core courses
  total += program.coreCourses.reduce((sum, c) => sum + c.credits, 0);

  // Support courses
  total += program.supportCourses.reduce((sum, c) => sum + c.credits, 0);

  // Elective groups (use requiredCredits)
  total += program.electiveGroups.reduce((sum, g) => sum + g.requiredCredits, 0);

  return total;
}

/**
 * Get all unique prerequisites across a program
 *
 * EDUCATIONAL NOTE - Set for Uniqueness:
 * We use a Set to automatically deduplicate prerequisites.
 * Sets only store unique values, making them ideal for this use case.
 *
 * @param program - The degree program
 * @returns Array of unique prerequisite course codes
 */
export function getAllPrerequisites(program: DegreeProgram): string[] {
  const prereqs = new Set<string>();

  getAllProgramCourses(program).forEach((course) => {
    course.prerequisites.forEach((prereq) => prereqs.add(prereq));
    course.corequisites.forEach((coreq) => prereqs.add(coreq));
  });

  return Array.from(prereqs).sort();
}

/**
 * Check if a course code belongs to the cybersecurity program
 *
 * @param courseCode - Course code to check
 * @returns True if it's a CYBR or security-related course
 */
export function isCybersecurityCourse(courseCode: string): boolean {
  const code = courseCode.toUpperCase();
  return code.startsWith('CYBR') || code.includes('SECURITY');
}

/**
 * Clear the program cache (useful for testing)
 */
export function clearProgramCache(): void {
  programCache.clear();
}
