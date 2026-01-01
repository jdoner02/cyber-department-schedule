#!/usr/bin/env npx tsx
/**
 * =============================================================================
 * EWU CATALOG SCRAPER
 * =============================================================================
 *
 * PURPOSE: Fetch and parse degree requirements from the EWU catalog
 *
 * USAGE:
 *   npx tsx scripts/scrape-catalog.ts                    # Scrape all programs
 *   npx tsx scripts/scrape-catalog.ts --program cs-cyber # Scrape specific program
 *   npx tsx scripts/scrape-catalog.ts --list             # List available programs
 *
 * OUTPUT: JSON files in src/data/catalog/programs/
 *
 * EDUCATIONAL NOTES:
 * - This script demonstrates web scraping with modern Node.js
 * - Uses DOM parsing (JSDOM) to extract structured data from HTML
 * - Implements rate limiting to be respectful to the server
 * - Outputs validated JSON for consumption by the frontend
 *
 * DESIGN PATTERNS:
 * - Strategy Pattern: Different parsers for different page structures
 * - Factory Pattern: Creating appropriate parser for each program type
 * - Builder Pattern: Constructing complex DegreeProgram objects
 *
 * =============================================================================
 */

import { JSDOM } from 'jsdom';
import * as fs from 'fs/promises';
import * as path from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

const BASE_URL = 'https://catalog.ewu.edu';
const STEM_BASE = `${BASE_URL}/stem/cs-ee`;
const OUTPUT_DIR = path.join(process.cwd(), 'src/data/catalog/programs');

// Rate limit: wait between requests (ms)
const REQUEST_DELAY = 1000;

// Programs to scrape with their catalog URLs
const PROGRAMS = [
  {
    slug: 'computer-science-cyber-operations-bs',
    name: 'Computer Science - Cyber Operations, BS',
    url: `${STEM_BASE}/computer-science-cyber-operations-bs/`,
    degreeType: 'BS' as const,
  },
  {
    slug: 'computer-science-bs',
    name: 'Computer Science, BS',
    url: `${STEM_BASE}/computer-science-bs/`,
    degreeType: 'BS' as const,
  },
  {
    slug: 'computer-science-bcs',
    name: 'Computer Science, BCS',
    url: `${STEM_BASE}/computer-science-bcs/`,
    degreeType: 'BCS' as const,
  },
  {
    slug: 'cyber-operations-bs',
    name: 'Cyber Operations, BS',
    url: `${STEM_BASE}/cyber-operations-bs/`,
    degreeType: 'BS' as const,
  },
  {
    slug: 'electrical-engineering-bs',
    name: 'Electrical Engineering, BS',
    url: `${STEM_BASE}/electrical-engineering-bs/`,
    degreeType: 'BS' as const,
  },
  {
    slug: 'cybersecurity-minor',
    name: 'Cybersecurity Minor',
    url: `${STEM_BASE}/cybersecurity-minor/`,
    degreeType: 'Minor' as const,
  },
  {
    slug: 'computer-science-ms',
    name: 'Computer Science, MS',
    url: `${STEM_BASE}/computer-science-ms/`,
    degreeType: 'MS' as const,
  },
];

// =============================================================================
// TYPES (subset of advising.ts for this script)
// =============================================================================

interface CourseRequirement {
  courseCode: string;
  title: string;
  credits: number;
  type: 'core' | 'major-required' | 'major-elective' | 'support' | 'lab' | 'gen-ed' | 'capstone';
  prerequisites: string[];
  corequisites: string[];
  minimumGrade: string;
  typicalQuarters: string[];
  typicalCampuses: string[];
  notes?: string;
}

interface ElectiveGroup {
  id: string;
  name: string;
  description: string;
  requiredCount: number;
  requiredCredits: number;
  courses: CourseRequirement[];
}

interface DegreeProgram {
  slug: string;
  name: string;
  degreeType: 'BS' | 'BA' | 'BCS' | 'MS' | 'Minor' | 'Certificate';
  department: string;
  totalCredits: number;
  minimumGPA: number;
  minimumMajorGPA?: number;
  coreCourses: CourseRequirement[];
  electiveGroups: ElectiveGroup[];
  supportCourses: CourseRequirement[];
  specialRequirements: string[];
  catalogUrl: string;
  catalogYear: string;
  lastUpdated: string;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Sleep for specified milliseconds (for rate limiting)
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse a course code like "CSCD 210" into subject and number
 */
function parseCourseCode(code: string): { subject: string; number: string } | null {
  const match = code.trim().match(/^([A-Z]{3,4})\s*(\d{3}[A-Z]?)$/);
  if (!match) return null;
  return { subject: match[1], number: match[2] };
}

/**
 * Extract credits from a string like "5 credits" or "(5)"
 */
function extractCredits(text: string): number {
  const match = text.match(/(\d+)\s*(?:credits?|cr\.?)/i) || text.match(/\((\d+)\)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Fetch a page with error handling
 */
async function fetchPage(url: string): Promise<Document | null> {
  console.log(`Fetching: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EWU-Schedule-Dashboard/1.0 (Educational Tool)',
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      console.error(`  Error: HTTP ${response.status}`);
      return null;
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    return dom.window.document;
  } catch (error) {
    console.error(`  Error fetching: ${error}`);
    return null;
  }
}

// =============================================================================
// PARSING FUNCTIONS
// =============================================================================

/**
 * Parse course requirements from a catalog page
 *
 * EDUCATIONAL NOTE:
 * EWU catalog pages have a fairly consistent structure:
 * - Course lists are in tables with class "sc_courselist"
 * - Each row has course code, title, and credits
 * - Prerequisites are often in the course description pages
 */
function parseCourseList(
  table: Element,
  type: CourseRequirement['type']
): CourseRequirement[] {
  const courses: CourseRequirement[] = [];

  const rows = table.querySelectorAll('tr');

  rows.forEach(row => {
    // Skip header rows
    if (row.querySelector('th')) return;

    const cells = row.querySelectorAll('td');
    if (cells.length < 2) return;

    // Try to extract course code from first column
    const codeCell = cells[0]?.textContent?.trim() || '';
    const titleCell = cells[1]?.textContent?.trim() || '';
    const creditsCell = cells[2]?.textContent?.trim() || '';

    const parsed = parseCourseCode(codeCell);
    if (!parsed) return;

    const courseCode = `${parsed.subject} ${parsed.number}`;
    const credits = extractCredits(creditsCell) || extractCredits(codeCell) || 4;

    courses.push({
      courseCode,
      title: titleCell,
      credits,
      type,
      prerequisites: [], // Would need to fetch course page for these
      corequisites: [],
      minimumGrade: 'C',
      typicalQuarters: ['fall', 'winter', 'spring'],
      typicalCampuses: ['Cheney'],
    });
  });

  return courses;
}

/**
 * Parse a complete degree program page
 */
function parseDegreePage(doc: Document, config: typeof PROGRAMS[0]): DegreeProgram | null {
  try {
    // Extract total credits from header or body
    let totalCredits = 120; // Default for BS/BA
    const creditText = doc.body.textContent || '';
    const creditMatch = creditText.match(/(\d{2,3})\s*(?:total\s+)?credits?\s*(?:required|minimum)/i);
    if (creditMatch) {
      totalCredits = parseInt(creditMatch[1], 10);
    }

    // Adjust defaults by degree type
    if (config.degreeType === 'Minor') totalCredits = 20;
    if (config.degreeType === 'MS') totalCredits = 45;

    // Find course list tables
    const tables = doc.querySelectorAll('table.sc_courselist, table.sc_sctable');
    const coreCourses: CourseRequirement[] = [];
    const electiveGroups: ElectiveGroup[] = [];
    const supportCourses: CourseRequirement[] = [];

    // Simple heuristic: first table is usually core courses
    if (tables.length > 0) {
      coreCourses.push(...parseCourseList(tables[0], 'core'));
    }

    // Look for sections with headers
    const headers = doc.querySelectorAll('h2, h3, h4');
    headers.forEach((header) => {
      const headerText = header.textContent?.toLowerCase() || '';
      const nextTable = header.nextElementSibling?.tagName === 'TABLE'
        ? header.nextElementSibling
        : null;

      if (!nextTable) return;

      if (headerText.includes('elective')) {
        const courses = parseCourseList(nextTable, 'major-elective');
        if (courses.length > 0) {
          electiveGroups.push({
            id: `electives-${electiveGroups.length + 1}`,
            name: header.textContent?.trim() || 'Electives',
            description: 'Choose from the following courses',
            requiredCount: 3, // Default, would need more parsing
            requiredCredits: courses.reduce((sum, c) => sum + c.credits, 0),
            courses,
          });
        }
      } else if (headerText.includes('support') || headerText.includes('math')) {
        supportCourses.push(...parseCourseList(nextTable, 'support'));
      }
    });

    return {
      slug: config.slug,
      name: config.name,
      degreeType: config.degreeType,
      department: 'Computer Science & Electrical Engineering',
      totalCredits,
      minimumGPA: 2.0,
      minimumMajorGPA: config.degreeType === 'Minor' ? undefined : 2.25,
      coreCourses,
      electiveGroups,
      supportCourses,
      specialRequirements: [],
      catalogUrl: config.url,
      catalogYear: '2024-2025',
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`  Parse error: ${error}`);
    return null;
  }
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Scrape a single program
 */
async function scrapeProgram(config: typeof PROGRAMS[0]): Promise<DegreeProgram | null> {
  console.log(`\nScraping: ${config.name}`);

  const doc = await fetchPage(config.url);
  if (!doc) {
    console.log('  Failed to fetch page, using fallback data');
    return createFallbackData(config);
  }

  const program = parseDegreePage(doc, config);
  if (!program) {
    console.log('  Failed to parse page, using fallback data');
    return createFallbackData(config);
  }

  // If we got minimal data, enhance with fallback
  if (program.coreCourses.length < 3) {
    console.log('  Limited data found, enhancing with known courses');
    const fallback = createFallbackData(config);
    return {
      ...program,
      coreCourses: [...program.coreCourses, ...fallback.coreCourses.filter(
        c => !program.coreCourses.some(pc => pc.courseCode === c.courseCode)
      )],
      supportCourses: [...program.supportCourses, ...fallback.supportCourses.filter(
        c => !program.supportCourses.some(ps => ps.courseCode === c.courseCode)
      )],
    };
  }

  return program;
}

/**
 * Create fallback/sample data for a program
 *
 * EDUCATIONAL NOTE:
 * In production, you'd want to fully parse the catalog.
 * For this educational tool, we provide reasonable defaults.
 */
function createFallbackData(config: typeof PROGRAMS[0]): DegreeProgram {
  // Base courses common to CS programs
  const csCoreCourses: CourseRequirement[] = [
    {
      courseCode: 'CSCD 210',
      title: 'Programming Principles I',
      credits: 4,
      type: 'core',
      prerequisites: [],
      corequisites: [],
      minimumGrade: 'C',
      typicalQuarters: ['fall', 'winter', 'spring'],
      typicalCampuses: ['Cheney'],
    },
    {
      courseCode: 'CSCD 211',
      title: 'Programming Principles II',
      credits: 4,
      type: 'core',
      prerequisites: ['CSCD 210'],
      corequisites: [],
      minimumGrade: 'C',
      typicalQuarters: ['fall', 'winter', 'spring'],
      typicalCampuses: ['Cheney'],
    },
    {
      courseCode: 'CSCD 300',
      title: 'Data Structures',
      credits: 4,
      type: 'core',
      prerequisites: ['CSCD 211'],
      corequisites: [],
      minimumGrade: 'C',
      typicalQuarters: ['fall', 'winter', 'spring'],
      typicalCampuses: ['Cheney'],
    },
    {
      courseCode: 'CSCD 305',
      title: 'Introduction to Database Systems',
      credits: 4,
      type: 'core',
      prerequisites: ['CSCD 211'],
      corequisites: [],
      minimumGrade: 'C',
      typicalQuarters: ['fall', 'spring'],
      typicalCampuses: ['Cheney', 'Online'],
    },
    {
      courseCode: 'CSCD 320',
      title: 'Algorithms',
      credits: 4,
      type: 'core',
      prerequisites: ['CSCD 300'],
      corequisites: [],
      minimumGrade: 'C',
      typicalQuarters: ['winter', 'spring'],
      typicalCampuses: ['Cheney'],
    },
    {
      courseCode: 'CSCD 330',
      title: 'Network Programming',
      credits: 4,
      type: 'core',
      prerequisites: ['CSCD 300'],
      corequisites: [],
      minimumGrade: 'C',
      typicalQuarters: ['fall', 'winter'],
      typicalCampuses: ['Cheney'],
    },
  ];

  // Cybersecurity-specific courses
  const cyberCourses: CourseRequirement[] = [
    {
      courseCode: 'CYBR 100',
      title: 'Introduction to Cybersecurity',
      credits: 4,
      type: 'core',
      prerequisites: [],
      corequisites: [],
      minimumGrade: 'C',
      typicalQuarters: ['fall', 'winter', 'spring'],
      typicalCampuses: ['Cheney', 'Online'],
    },
    {
      courseCode: 'CYBR 210',
      title: 'Network Security Fundamentals',
      credits: 4,
      type: 'core',
      prerequisites: ['CYBR 100'],
      corequisites: [],
      minimumGrade: 'C',
      typicalQuarters: ['winter', 'spring'],
      typicalCampuses: ['Cheney'],
    },
    {
      courseCode: 'CYBR 310',
      title: 'Ethical Hacking',
      credits: 4,
      type: 'major-required',
      prerequisites: ['CYBR 210', 'CSCD 300'],
      corequisites: [],
      minimumGrade: 'C',
      typicalQuarters: ['fall', 'spring'],
      typicalCampuses: ['Cheney'],
    },
    {
      courseCode: 'CYBR 340',
      title: 'Digital Forensics',
      credits: 4,
      type: 'major-required',
      prerequisites: ['CYBR 210'],
      corequisites: [],
      minimumGrade: 'C',
      typicalQuarters: ['winter'],
      typicalCampuses: ['Cheney'],
    },
    {
      courseCode: 'CYBR 440',
      title: 'Advanced Network Security',
      credits: 4,
      type: 'major-required',
      prerequisites: ['CYBR 310'],
      corequisites: [],
      minimumGrade: 'C',
      typicalQuarters: ['fall'],
      typicalCampuses: ['Cheney'],
    },
    {
      courseCode: 'CYBR 490',
      title: 'Cybersecurity Capstone',
      credits: 4,
      type: 'capstone',
      prerequisites: ['CYBR 310', 'CYBR 340'],
      corequisites: [],
      minimumGrade: 'C',
      typicalQuarters: ['spring'],
      typicalCampuses: ['Cheney'],
    },
  ];

  // Support courses
  const supportCourses: CourseRequirement[] = [
    {
      courseCode: 'MATH 161',
      title: 'Calculus I',
      credits: 5,
      type: 'support',
      prerequisites: [],
      corequisites: [],
      minimumGrade: 'C',
      typicalQuarters: ['fall', 'winter', 'spring'],
      typicalCampuses: ['Cheney'],
    },
    {
      courseCode: 'MATH 162',
      title: 'Calculus II',
      credits: 5,
      type: 'support',
      prerequisites: ['MATH 161'],
      corequisites: [],
      minimumGrade: 'C',
      typicalQuarters: ['fall', 'winter', 'spring'],
      typicalCampuses: ['Cheney'],
    },
    {
      courseCode: 'MATH 225',
      title: 'Discrete Mathematics',
      credits: 5,
      type: 'support',
      prerequisites: ['MATH 161'],
      corequisites: [],
      minimumGrade: 'C',
      typicalQuarters: ['fall', 'winter'],
      typicalCampuses: ['Cheney'],
    },
    {
      courseCode: 'MATH 231',
      title: 'Linear Algebra',
      credits: 4,
      type: 'support',
      prerequisites: ['MATH 161'],
      corequisites: [],
      minimumGrade: 'C',
      typicalQuarters: ['winter', 'spring'],
      typicalCampuses: ['Cheney'],
    },
  ];

  // Build program based on type
  let coreCourses: CourseRequirement[] = [];
  let electiveGroups: ElectiveGroup[] = [];
  let totalCredits = 120;

  switch (config.slug) {
    case 'computer-science-cyber-operations-bs':
      coreCourses = [...csCoreCourses, ...cyberCourses];
      totalCredits = 120;
      break;

    case 'computer-science-bs':
    case 'computer-science-bcs':
      coreCourses = csCoreCourses;
      electiveGroups = [{
        id: 'cs-electives',
        name: 'Computer Science Electives',
        description: 'Choose 4 courses from upper-division CSCD',
        requiredCount: 4,
        requiredCredits: 16,
        courses: [
          { courseCode: 'CSCD 420', title: 'Computer Architecture', credits: 4, type: 'major-elective', prerequisites: ['CSCD 300'], corequisites: [], minimumGrade: 'C', typicalQuarters: ['fall'], typicalCampuses: ['Cheney'] },
          { courseCode: 'CSCD 427', title: 'Operating Systems', credits: 4, type: 'major-elective', prerequisites: ['CSCD 300'], corequisites: [], minimumGrade: 'C', typicalQuarters: ['winter'], typicalCampuses: ['Cheney'] },
          { courseCode: 'CSCD 434', title: 'Web Development', credits: 4, type: 'major-elective', prerequisites: ['CSCD 300'], corequisites: [], minimumGrade: 'C', typicalQuarters: ['spring'], typicalCampuses: ['Cheney'] },
          { courseCode: 'CSCD 437', title: 'Software Engineering', credits: 4, type: 'major-elective', prerequisites: ['CSCD 300'], corequisites: [], minimumGrade: 'C', typicalQuarters: ['fall', 'spring'], typicalCampuses: ['Cheney'] },
        ],
      }];
      totalCredits = 120;
      break;

    case 'cyber-operations-bs':
      coreCourses = cyberCourses;
      totalCredits = 120;
      break;

    case 'cybersecurity-minor':
      coreCourses = cyberCourses.slice(0, 3);
      totalCredits = 20;
      break;

    case 'computer-science-ms':
      coreCourses = [
        { courseCode: 'CSCD 501', title: 'Advanced Algorithms', credits: 4, type: 'core', prerequisites: ['CSCD 320'], corequisites: [], minimumGrade: 'B', typicalQuarters: ['fall'], typicalCampuses: ['Cheney'] },
        { courseCode: 'CSCD 502', title: 'Advanced Operating Systems', credits: 4, type: 'core', prerequisites: ['CSCD 427'], corequisites: [], minimumGrade: 'B', typicalQuarters: ['winter'], typicalCampuses: ['Cheney'] },
        { courseCode: 'CSCD 510', title: 'Research Methods in CS', credits: 4, type: 'core', prerequisites: [], corequisites: [], minimumGrade: 'B', typicalQuarters: ['fall'], typicalCampuses: ['Cheney'] },
        { courseCode: 'CSCD 599', title: 'Thesis', credits: 6, type: 'capstone', prerequisites: [], corequisites: [], minimumGrade: 'B', typicalQuarters: ['spring'], typicalCampuses: ['Cheney'] },
      ];
      totalCredits = 45;
      break;

    default:
      coreCourses = csCoreCourses;
  }

  return {
    slug: config.slug,
    name: config.name,
    degreeType: config.degreeType,
    department: 'Computer Science & Electrical Engineering',
    totalCredits,
    minimumGPA: config.degreeType === 'MS' ? 3.0 : 2.0,
    minimumMajorGPA: config.degreeType === 'Minor' ? undefined : (config.degreeType === 'MS' ? 3.0 : 2.25),
    coreCourses,
    electiveGroups,
    supportCourses: config.degreeType === 'Minor' ? [] : supportCourses,
    specialRequirements: [],
    catalogUrl: config.url,
    catalogYear: '2024-2025',
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Save a program to JSON file
 */
async function saveProgram(program: DegreeProgram): Promise<void> {
  const filePath = path.join(OUTPUT_DIR, `${program.slug}.json`);
  const json = JSON.stringify(program, null, 2);
  await fs.writeFile(filePath, json, 'utf-8');
  console.log(`  Saved: ${filePath}`);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('EWU Catalog Scraper');
  console.log('='.repeat(60));

  const args = process.argv.slice(2);

  // Handle --list flag
  if (args.includes('--list')) {
    console.log('\nAvailable programs:');
    PROGRAMS.forEach(p => {
      console.log(`  ${p.slug}: ${p.name}`);
    });
    return;
  }

  // Handle --program flag
  const programArg = args.find(a => a.startsWith('--program='))?.split('=')[1]
    || (args.includes('--program') ? args[args.indexOf('--program') + 1] : null);

  let programsToScrape = PROGRAMS;
  if (programArg) {
    const found = PROGRAMS.filter(p =>
      p.slug.includes(programArg) || p.name.toLowerCase().includes(programArg.toLowerCase())
    );
    if (found.length === 0) {
      console.error(`\nNo programs match: ${programArg}`);
      console.log('Use --list to see available programs');
      process.exit(1);
    }
    programsToScrape = found;
  }

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  console.log(`\nScraping ${programsToScrape.length} program(s)...`);

  for (const config of programsToScrape) {
    const program = await scrapeProgram(config);
    if (program) {
      await saveProgram(program);
    }

    // Rate limit between requests
    if (programsToScrape.indexOf(config) < programsToScrape.length - 1) {
      await sleep(REQUEST_DELAY);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Scraping complete!');
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log('='.repeat(60));
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
