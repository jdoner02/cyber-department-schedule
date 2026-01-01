/**
 * Fetch salary data from GovSalaries.com
 *
 * This scraper fetches current employee salary data for UW and EWU
 * from GovSalaries.com's publicly available pages.
 *
 * Usage: npx tsx scripts/fetch-govsalaries.ts
 *
 * Note: Please respect rate limits and the site's robots.txt
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../data/salaries/raw/third-party');

// Target employers
const EMPLOYERS = [
  {
    code: 'UW',
    name: 'University of Washington',
    url: 'https://govsalaries.com/salaries/WA/university-of-washington'
  },
  {
    code: 'EWU',
    name: 'Eastern Washington University',
    url: 'https://govsalaries.com/salaries/WA/eastern-washington-university'
  }
];

interface SalaryRecord {
  name: string;
  position: string;
  salary: number;
  year: number;
}

// Rate limiting helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; salary-data-research)',
      'Accept': 'text/html,application/xhtml+xml'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.text();
}

function parseHTML(html: string): SalaryRecord[] {
  const records: SalaryRecord[] = [];

  // Extract table rows using regex (simple approach without DOM parser)
  // Looking for patterns like: <tr>...<td>Name</td><td>Position</td><td>$123,456</td>...</tr>

  // Extract year from page content
  const yearMatch = html.match(/salary database for year (\d{4})/i) ||
                    html.match(/data[a-z\s]+(\d{4})/i);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

  // Find the main salary table
  // Pattern: <a href="/salaries/WA/...">Name</a> ... position ... $amount
  const rowPattern = /<tr[^>]*>[\s\S]*?<td[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>\$?([\d,]+)/gi;

  let match;
  while ((match = rowPattern.exec(html)) !== null) {
    const name = match[1].trim();
    const position = match[2].trim();
    const salaryStr = match[3].replace(/,/g, '');
    const salary = parseFloat(salaryStr);

    if (name && position && !isNaN(salary) && salary > 0) {
      records.push({ name, position, salary, year });
    }
  }

  return records;
}

async function fetchEmployerData(employer: typeof EMPLOYERS[0]): Promise<SalaryRecord[]> {
  const allRecords: SalaryRecord[] = [];
  let page = 1;
  const maxPages = 100; // Safety limit

  console.log(`Fetching data for: ${employer.name}`);

  while (page <= maxPages) {
    const url = page === 1 ? employer.url : `${employer.url}?page=${page}`;
    console.log(`  Fetching page ${page}...`);

    try {
      const html = await fetchPage(url);
      const records = parseHTML(html);

      if (records.length === 0) {
        console.log(`  No more records found on page ${page}`);
        break;
      }

      allRecords.push(...records);
      console.log(`  Found ${records.length} records (total: ${allRecords.length})`);

      // Check if there's a next page link
      if (!html.includes(`page=${page + 1}`) && !html.includes('Next')) {
        console.log('  Reached last page');
        break;
      }

      page++;

      // Rate limiting - wait 1 second between requests
      await delay(1000);
    } catch (error) {
      console.error(`  Error on page ${page}:`, error);
      break;
    }
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
      const records = await fetchEmployerData(employer);

      const filename = `govsalaries-${employer.code.toLowerCase()}.json`;
      const filepath = path.join(OUTPUT_DIR, filename);

      const output = {
        metadata: {
          source: 'govsalaries.com',
          sourceUrl: employer.url,
          employer: employer.name,
          employerCode: employer.code,
          fetchedAt: new Date().toISOString(),
          recordCount: records.length,
          note: 'Scraped from public website. Data may be incomplete due to pagination limits.'
        },
        records
      };

      fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
      console.log(`Saved ${records.length} records to ${filename}`);

      results[employer.code] = { recordCount: records.length, file: filename };

      // Wait between employers
      await delay(2000);
    } catch (error) {
      console.error(`Error fetching ${employer.name}:`, error);
    }
  }

  // Save summary
  const summaryPath = path.join(OUTPUT_DIR, 'govsalaries-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    fetchedAt: new Date().toISOString(),
    source: 'govsalaries.com',
    results,
    note: 'Data scraped from public website. For complete current data, use fiscal.wa.gov bulk download.'
  }, null, 2));

  console.log('\nFetch complete! Summary saved to govsalaries-summary.json');
}

main().catch(console.error);
