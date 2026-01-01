/**
 * Process and normalize salary data from multiple sources
 *
 * This script:
 * 1. Loads raw data from data.wa.gov and other sources
 * 2. Normalizes to a common schema
 * 3. Deduplicates records
 * 4. Outputs final JSON files organized by employer and year
 *
 * Usage: npx tsx scripts/process-salaries.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import type { EmployeeSalary } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAW_DIR = path.join(__dirname, '../data/salaries/raw');
const PROCESSED_DIR = path.join(__dirname, '../data/salaries/processed');
const METADATA_DIR = path.join(__dirname, '../data/salaries/metadata');

interface DataWaGovRecord {
  agency?: string;
  agencytitle?: string;
  employeename?: string;
  jobtitle?: string;
  salary2010?: string;
  salary2011?: string;
  salary2012?: string;
  salary2013?: string;
}

interface RawDataFile {
  metadata: {
    source: string;
    employer: string;
    employerCode: string;
    fetchedAt: string;
    recordCount: number;
    years?: number[];
  };
  records: DataWaGovRecord[];
}

function generateId(name: string, employer: string, year: number): string {
  const hash = crypto.createHash('sha256');
  hash.update(`${name}|${employer}|${year}`);
  return hash.digest('hex').substring(0, 16);
}

function normalizeDataWaGov(raw: RawDataFile): EmployeeSalary[] {
  const records: EmployeeSalary[] = [];
  const now = new Date().toISOString();

  for (const r of raw.records) {
    const name = r.employeename || '';
    const position = r.jobtitle || '';
    const employer = raw.metadata.employerCode as 'UW' | 'EWU';
    const employerFull = raw.metadata.employer;

    // Process each year's salary
    const yearSalaries: [number, string | undefined][] = [
      [2010, r.salary2010],
      [2011, r.salary2011],
      [2012, r.salary2012],
      [2013, r.salary2013]
    ];

    for (const [year, salaryStr] of yearSalaries) {
      if (!salaryStr) continue;

      const salary = parseFloat(salaryStr);
      if (isNaN(salary) || salary <= 0) continue;

      records.push({
        id: generateId(name, employer, year),
        name,
        employer,
        employerFull,
        position,
        salary,
        year,
        source: 'data-wa-gov',
        lastUpdated: now
      });
    }
  }

  return records;
}

function deduplicateRecords(records: EmployeeSalary[]): EmployeeSalary[] {
  const seen = new Map<string, EmployeeSalary>();

  for (const record of records) {
    const key = `${record.name}|${record.employer}|${record.year}|${record.position}`;

    if (!seen.has(key)) {
      seen.set(key, record);
    } else {
      // Keep the higher salary if duplicate (prefer official sources)
      const existing = seen.get(key)!;
      if (record.salary > existing.salary) {
        seen.set(key, record);
      }
    }
  }

  return Array.from(seen.values());
}

function groupByYear(records: EmployeeSalary[]): Map<number, EmployeeSalary[]> {
  const byYear = new Map<number, EmployeeSalary[]>();

  for (const record of records) {
    if (!byYear.has(record.year)) {
      byYear.set(record.year, []);
    }
    byYear.get(record.year)!.push(record);
  }

  return byYear;
}

async function main() {
  console.log('Processing salary data...\n');

  const allRecords: { UW: EmployeeSalary[]; EWU: EmployeeSalary[] } = {
    UW: [],
    EWU: []
  };

  // Load data.wa.gov files
  const dataWaGovDir = path.join(RAW_DIR, 'data-wa-gov');
  if (fs.existsSync(dataWaGovDir)) {
    const files = fs.readdirSync(dataWaGovDir).filter(f => f.endsWith('.json') && !f.includes('summary'));

    for (const file of files) {
      console.log(`Processing ${file}...`);
      const filePath = path.join(dataWaGovDir, file);
      const raw: RawDataFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const normalized = normalizeDataWaGov(raw);

      const employer = raw.metadata.employerCode as 'UW' | 'EWU';
      // Use concat to avoid stack overflow with large arrays
      allRecords[employer] = allRecords[employer].concat(normalized);
      console.log(`  Added ${normalized.length} records for ${employer}`);
    }
  }

  // Process each employer
  for (const employer of ['UW', 'EWU'] as const) {
    const records = allRecords[employer];
    console.log(`\nProcessing ${employer}: ${records.length} total records`);

    // Deduplicate
    const deduplicated = deduplicateRecords(records);
    console.log(`  After deduplication: ${deduplicated.length} records`);

    // Sort by name then year (simple sort to avoid stack issues)
    deduplicated.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return a.year - b.year;
    });

    // Ensure output directories exist
    const employerDir = path.join(PROCESSED_DIR, employer.toLowerCase());
    const byYearDir = path.join(employerDir, 'by-year');
    if (!fs.existsSync(byYearDir)) {
      fs.mkdirSync(byYearDir, { recursive: true });
    }

    // Calculate year range without spread operator (avoids stack overflow)
    const years = deduplicated.map(r => r.year);
    const minYear = years.reduce((a, b) => a < b ? a : b, years[0]);
    const maxYear = years.reduce((a, b) => a > b ? a : b, years[0]);

    // Write all employees file
    const allFile = path.join(employerDir, 'all-employees.json');
    fs.writeFileSync(allFile, JSON.stringify({
      metadata: {
        employer,
        totalRecords: deduplicated.length,
        yearRange: { min: minYear, max: maxYear },
        generatedAt: new Date().toISOString()
      },
      records: deduplicated
    }, null, 2));
    console.log(`  Wrote ${allFile}`);

    // Write by-year files
    const byYear = groupByYear(deduplicated);
    for (const [year, yearRecords] of byYear) {
      const yearFile = path.join(byYearDir, `${year}.json`);
      fs.writeFileSync(yearFile, JSON.stringify({
        metadata: {
          employer,
          year,
          recordCount: yearRecords.length,
          generatedAt: new Date().toISOString()
        },
        records: yearRecords
      }, null, 2));
      console.log(`  Wrote ${yearFile} (${yearRecords.length} records)`);
    }
  }

  // Update sources metadata
  const sourcesFile = path.join(METADATA_DIR, 'sources.json');
  if (fs.existsSync(sourcesFile)) {
    const sources = JSON.parse(fs.readFileSync(sourcesFile, 'utf-8'));
    sources.lastUpdated = new Date().toISOString();
    sources.statistics = {
      UW: {
        totalRecords: allRecords.UW.length,
        afterDeduplication: deduplicateRecords(allRecords.UW).length
      },
      EWU: {
        totalRecords: allRecords.EWU.length,
        afterDeduplication: deduplicateRecords(allRecords.EWU).length
      }
    };
    fs.writeFileSync(sourcesFile, JSON.stringify(sources, null, 2));
    console.log(`\nUpdated ${sourcesFile}`);
  }

  console.log('\nProcessing complete!');
}

main().catch(console.error);
