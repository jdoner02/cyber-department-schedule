/**
 * =============================================================================
 * MODULE: Academic Terms
 * =============================================================================
 *
 * PURPOSE: Utilities for working with EWU academic terms
 *
 * EDUCATIONAL NOTES:
 * - EWU uses a quarter system: Fall, Winter, Spring, Summer
 * - Term codes follow Banner format: YYYYQQ (e.g., "202540" = Fall 2025)
 * - The QQ suffix indicates the quarter:
 *   - 10 = Winter (January - March)
 *   - 20 = Spring (April - June)
 *   - 30 = Summer (July - August)
 *   - 40 = Fall (September - December)
 *
 * DESIGN PATTERN: Utility Module
 * - Pure functions for term manipulation
 * - No side effects, easy to test
 * - Can be used throughout the application
 * =============================================================================
 */

import type { AcademicTerm, Quarter } from '../types/advising';

// Re-export Quarter as AcademicQuarter for backwards compatibility
export type AcademicQuarter = Quarter;

/**
 * Quarter codes used in Banner system
 *
 * EDUCATIONAL NOTE:
 * These are the standard Banner suffix codes for academic quarters.
 * The order matters - we use it for comparison and iteration.
 */
export const QUARTER_CODES = {
  winter: '10',
  spring: '20',
  summer: '30',
  fall: '40',
} as const;

/**
 * Human-readable quarter names
 */
export const QUARTER_NAMES: Record<AcademicQuarter, string> = {
  fall: 'Fall',
  winter: 'Winter',
  spring: 'Spring',
  summer: 'Summer',
};

/**
 * Quarter order for iteration (chronological within a calendar year)
 */
export const QUARTER_ORDER: AcademicQuarter[] = ['winter', 'spring', 'summer', 'fall'];

/**
 * Typical credit loads per quarter
 */
export const CREDIT_LIMITS = {
  minimum: 12,      // Full-time status minimum
  standard: 15,     // Typical load
  maximum: 18,      // Standard max without override
  overload: 21,     // Requires advisor approval
} as const;

/**
 * Parse a term code into year and quarter
 *
 * EDUCATIONAL NOTE - String Parsing:
 * This demonstrates extracting structured data from a formatted string.
 * We use substring() for predictable, fixed-position parsing.
 *
 * @param termCode - Banner format term code (e.g., "202510")
 * @returns Object with year number and quarter name
 * @throws Error if term code format is invalid
 *
 * @example
 * parseTerm("202510") // => { year: 2025, quarter: 'winter' }
 * parseTerm("202540") // => { year: 2025, quarter: 'fall' }
 */
export function parseTerm(termCode: AcademicTerm): { year: number; quarter: AcademicQuarter } {
  if (!/^\d{6}$/.test(termCode)) {
    throw new Error(`Invalid term code format: "${termCode}". Expected YYYYQQ format.`);
  }

  const yearStr = termCode.substring(0, 4);
  const quarterCode = termCode.substring(4, 6);

  const year = parseInt(yearStr, 10);

  // Find the quarter that matches this code
  const quarterEntry = Object.entries(QUARTER_CODES).find(([, code]) => code === quarterCode);

  if (!quarterEntry) {
    throw new Error(`Invalid quarter code: "${quarterCode}". Expected 10, 20, 30, or 40.`);
  }

  return {
    year,
    quarter: quarterEntry[0] as AcademicQuarter,
  };
}

/**
 * Create a term code from year and quarter
 *
 * @param year - Four-digit year (e.g., 2025)
 * @param quarter - Quarter name (e.g., 'fall')
 * @returns Banner format term code
 *
 * @example
 * createTerm(2025, 'winter') // => "202510"
 * createTerm(2024, 'fall') // => "202440"
 */
export function createTerm(year: number, quarter: AcademicQuarter): AcademicTerm {
  if (year < 2000 || year > 2100) {
    throw new Error(`Year ${year} is out of reasonable range (2000-2100).`);
  }

  const quarterCode = QUARTER_CODES[quarter];
  return `${year}${quarterCode}` as AcademicTerm;
}

/**
 * Format a term code for human-readable display
 *
 * @param termCode - Banner format term code
 * @returns Formatted string like "Fall 2025"
 *
 * @example
 * formatTerm("202510") // => "Winter 2025"
 * formatTerm("202540") // => "Fall 2025"
 */
export function formatTerm(termCode: AcademicTerm): string {
  const { year, quarter } = parseTerm(termCode);
  return `${QUARTER_NAMES[quarter]} ${year}`;
}

/**
 * Compare two terms chronologically
 *
 * EDUCATIONAL NOTE - Comparator Function:
 * This follows the standard comparator contract used by Array.sort():
 * - Returns negative if a < b
 * - Returns positive if a > b
 * - Returns 0 if a === b
 *
 * @param termA - First term code
 * @param termB - Second term code
 * @returns Negative if termA is earlier, positive if later, 0 if same
 *
 * @example
 * compareTerms("202510", "202520") // => -1 (Winter before Spring)
 * compareTerms("202540", "202510") // => 1 (Fall after Winter)
 * compareTerms("202510", "202510") // => 0 (same term)
 */
export function compareTerms(termA: AcademicTerm, termB: AcademicTerm): number {
  // Simple numeric comparison works because term codes are lexicographically ordered
  // e.g., "202510" < "202520" < "202530" < "202540" < "202610"
  const numA = parseInt(termA, 10);
  const numB = parseInt(termB, 10);

  return numA - numB;
}

/**
 * Check if termA is before termB
 */
export function isTermBefore(termA: AcademicTerm, termB: AcademicTerm): boolean {
  return compareTerms(termA, termB) < 0;
}

/**
 * Check if termA is after termB
 */
export function isTermAfter(termA: AcademicTerm, termB: AcademicTerm): boolean {
  return compareTerms(termA, termB) > 0;
}

/**
 * Get the next academic term
 *
 * @param termCode - Current term code
 * @returns The following term code
 *
 * @example
 * getNextTerm("202520") // => "202530" (Spring -> Summer)
 * getNextTerm("202540") // => "202610" (Fall -> Winter next year)
 */
export function getNextTerm(termCode: AcademicTerm): AcademicTerm {
  const { year, quarter } = parseTerm(termCode);
  const currentIndex = QUARTER_ORDER.indexOf(quarter);

  if (currentIndex === QUARTER_ORDER.length - 1) {
    // Fall -> Winter of next year
    return createTerm(year + 1, 'winter');
  }

  // Move to next quarter in same year
  return createTerm(year, QUARTER_ORDER[currentIndex + 1]);
}

/**
 * Get the previous academic term
 *
 * @param termCode - Current term code
 * @returns The preceding term code
 *
 * @example
 * getPreviousTerm("202520") // => "202510" (Spring -> Winter)
 * getPreviousTerm("202510") // => "202440" (Winter -> Fall previous year)
 */
export function getPreviousTerm(termCode: AcademicTerm): AcademicTerm {
  const { year, quarter } = parseTerm(termCode);
  const currentIndex = QUARTER_ORDER.indexOf(quarter);

  if (currentIndex === 0) {
    // Winter -> Fall of previous year
    return createTerm(year - 1, 'fall');
  }

  // Move to previous quarter in same year
  return createTerm(year, QUARTER_ORDER[currentIndex - 1]);
}

/**
 * Calculate the number of quarters between two terms
 *
 * EDUCATIONAL NOTE - Date Arithmetic:
 * This is useful for graduation planning calculations.
 * We convert both terms to a linear "quarter number" for easy subtraction.
 *
 * @param startTerm - Earlier term
 * @param endTerm - Later term
 * @returns Number of quarters (inclusive of end, exclusive of start)
 *
 * @example
 * getQuartersBetween("202510", "202530") // => 2 (Fall to Spring = 2 quarters)
 * getQuartersBetween("202510", "202610") // => 4 (Fall to Fall = 4 quarters)
 */
export function getQuartersBetween(startTerm: AcademicTerm, endTerm: AcademicTerm): number {
  const start = parseTerm(startTerm);
  const end = parseTerm(endTerm);

  // Convert to linear quarter number (e.g., 2025 Fall = 2025*4 + 0 = 8100)
  const startQuarter = start.year * 4 + QUARTER_ORDER.indexOf(start.quarter);
  const endQuarter = end.year * 4 + QUARTER_ORDER.indexOf(end.quarter);

  return endQuarter - startQuarter;
}

/**
 * Add a number of quarters to a term
 *
 * @param termCode - Starting term
 * @param quarters - Number of quarters to add (can be negative)
 * @returns Resulting term code
 *
 * @example
 * addQuarters("202510", 3) // => "202540" (Fall + 3 = Summer)
 * addQuarters("202510", 4) // => "202610" (Fall + 4 = next Fall)
 * addQuarters("202510", -1) // => "202440" (Fall - 1 = previous Summer)
 */
export function addQuarters(termCode: AcademicTerm, quarters: number): AcademicTerm {
  const { year, quarter } = parseTerm(termCode);
  const currentIndex = QUARTER_ORDER.indexOf(quarter);

  // Calculate total quarters from year 0
  const totalQuarters = year * 4 + currentIndex + quarters;

  // Convert back to year and quarter
  const newYear = Math.floor(totalQuarters / 4);
  const newQuarterIndex = ((totalQuarters % 4) + 4) % 4; // Handle negative modulo

  return createTerm(newYear, QUARTER_ORDER[newQuarterIndex]);
}

/**
 * Generate a range of terms between start and end (inclusive)
 *
 * EDUCATIONAL NOTE - Generator Pattern:
 * We use a simple loop here, but this could also be implemented as
 * a generator function for lazy evaluation of large ranges.
 *
 * @param startTerm - First term in range
 * @param endTerm - Last term in range
 * @returns Array of all terms in the range
 *
 * @example
 * getTermRange("202510", "202530") // => ["202510", "202520", "202530"]
 */
export function getTermRange(startTerm: AcademicTerm, endTerm: AcademicTerm): AcademicTerm[] {
  if (compareTerms(startTerm, endTerm) > 0) {
    return []; // Start is after end, return empty
  }

  const terms: AcademicTerm[] = [];
  let current = startTerm;

  while (compareTerms(current, endTerm) <= 0) {
    terms.push(current);
    current = getNextTerm(current);
  }

  return terms;
}

/**
 * Get the current academic term based on today's date
 *
 * EDUCATIONAL NOTE:
 * EWU's academic calendar roughly follows:
 * - Fall: September - December (classes start late September)
 * - Winter: January - March
 * - Spring: April - June
 * - Summer: July - August
 */
export function getCurrentTerm(): AcademicTerm {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // JavaScript months are 0-indexed

  let quarter: AcademicQuarter;

  if (month >= 9) {
    quarter = 'fall';
  } else if (month >= 7) {
    quarter = 'summer';
  } else if (month >= 4) {
    quarter = 'spring';
  } else {
    quarter = 'winter';
  }

  return createTerm(year, quarter);
}

/**
 * Calculate expected graduation term given start and total quarters
 *
 * @param startTerm - When student started
 * @param totalQuarters - Standard program length (default: 12 for 3-year plan, 16 for 4-year)
 * @returns Expected graduation term
 */
export function calculateExpectedGraduation(
  startTerm: AcademicTerm,
  totalQuarters: number = 12
): AcademicTerm {
  // Subtract 1 because graduation happens AT the end of the final term
  return addQuarters(startTerm, totalQuarters - 1);
}

/**
 * Determine the academic year for a given term
 * Academic year is named after the year it starts (e.g., 2024-25 academic year)
 *
 * @param termCode - Term to check
 * @returns Academic year string (e.g., "2024-25")
 */
export function getAcademicYear(termCode: AcademicTerm): string {
  const { year, quarter } = parseTerm(termCode);

  // Fall starts a new academic year
  if (quarter === 'fall') {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  }

  // Winter, Spring, Summer belong to the academic year that started previous Fall
  return `${year - 1}-${year.toString().slice(-2)}`;
}
