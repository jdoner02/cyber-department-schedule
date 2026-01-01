/**
 * Fetch salary data from data.wa.gov (Socrata API)
 *
 * Dataset: y3ds-rkew (Annual Salary 2010-2013)
 * Contains: Agency, AgencyTitle, EmployeeName, JobTitle, Salary2010-2013
 *
 * Usage: npx tsx scripts/fetch-data-wa-gov.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASET_ID = 'y3ds-rkew';
const BASE_URL = `https://data.wa.gov/resource/${DATASET_ID}.json`;
const OUTPUT_DIR = path.join(__dirname, '../data/salaries/raw/data-wa-gov');

// Target employers
const EMPLOYERS = [
  { code: 'UW', name: 'University of Washington' },
  { code: 'EWU', name: 'Eastern Washington University' }
];

interface RawRecord {
  agency?: string;
  agencytitle?: string;
  employeename?: string;
  jobtitle?: string;
  salary2010?: string;
  salary2011?: string;
  salary2012?: string;
  salary2013?: string;
}

async function fetchJSON(url: string): Promise<RawRecord[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<RawRecord[]>;
}

async function fetchEmployerData(employerName: string): Promise<RawRecord[]> {
  const allRecords: RawRecord[] = [];
  const limit = 10000;
  let offset = 0;

  console.log(`Fetching data for: ${employerName}`);

  while (true) {
    const whereClause = encodeURIComponent(`agencytitle='${employerName}'`);
    const url = `${BASE_URL}?$where=${whereClause}&$limit=${limit}&$offset=${offset}`;

    console.log(`  Fetching offset ${offset}...`);
    const records = await fetchJSON(url);

    if (records.length === 0) break;

    allRecords.push(...records);
    offset += limit;

    if (records.length < limit) break;

    // Rate limiting - wait 500ms between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`  Total records: ${allRecords.length}`);
  return allRecords;
}

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const results: { [key: string]: { recordCount: number; file: string } } = {};

  for (const employer of EMPLOYERS) {
    try {
      const records = await fetchEmployerData(employer.name);

      const filename = `${employer.code.toLowerCase()}-2010-2013.json`;
      const filepath = path.join(OUTPUT_DIR, filename);

      const output = {
        metadata: {
          source: 'data.wa.gov',
          datasetId: DATASET_ID,
          employer: employer.name,
          employerCode: employer.code,
          fetchedAt: new Date().toISOString(),
          recordCount: records.length,
          years: [2010, 2011, 2012, 2013]
        },
        records
      };

      fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
      console.log(`Saved ${records.length} records to ${filename}`);

      results[employer.code] = { recordCount: records.length, file: filename };
    } catch (error) {
      console.error(`Error fetching ${employer.name}:`, error);
    }
  }

  // Save summary
  const summaryPath = path.join(OUTPUT_DIR, 'fetch-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    fetchedAt: new Date().toISOString(),
    source: 'data.wa.gov',
    datasetId: DATASET_ID,
    results
  }, null, 2));

  console.log('\nFetch complete! Summary saved to fetch-summary.json');
}

main().catch(console.error);
