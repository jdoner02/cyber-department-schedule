import { describe, it, expect } from 'vitest';
import {
  parseTerm,
  formatTerm,
  getNextTerm,
  getPreviousTerm,
  addQuarters,
  getQuartersBetween,
  getAcademicYear,
} from './academicTerms';

describe('academicTerms', () => {
  it('parses quarter codes using EWU Banner mapping', () => {
    expect(parseTerm('202510')).toEqual({ year: 2025, quarter: 'winter' });
    expect(parseTerm('202520')).toEqual({ year: 2025, quarter: 'spring' });
    expect(parseTerm('202530')).toEqual({ year: 2025, quarter: 'summer' });
    expect(parseTerm('202540')).toEqual({ year: 2025, quarter: 'fall' });
  });

  it('formats term codes for display', () => {
    expect(formatTerm('202620')).toBe('Spring 2026');
    expect(formatTerm('202540')).toBe('Fall 2025');
  });

  it('moves between terms chronologically', () => {
    expect(getNextTerm('202540')).toBe('202610'); // Fall 2025 -> Winter 2026
    expect(getPreviousTerm('202610')).toBe('202540'); // Winter 2026 -> Fall 2025
    expect(addQuarters('202540', 1)).toBe('202610');
    expect(addQuarters('202510', -1)).toBe('202440');
  });

  it('computes term arithmetic correctly', () => {
    expect(getQuartersBetween('202510', '202540')).toBe(3); // Winter -> Fall within year
    expect(getAcademicYear('202510')).toBe('2024-25');
    expect(getAcademicYear('202540')).toBe('2025-26');
  });
});

