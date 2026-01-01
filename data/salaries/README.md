# Washington State Salary Data

Public employee salary data for University of Washington (UW) and Eastern Washington University (EWU).

## Data Overview

| Institution | Records | Years | Source |
|-------------|---------|-------|--------|
| UW | 193,876 | 2010-2013 | data.wa.gov |
| EWU | 11,197 | 2010-2013 | data.wa.gov |

## Directory Structure

```
salaries/
├── raw/                          # Original downloaded data
│   ├── data-wa-gov/              # From Socrata API
│   │   ├── uw-2010-2013.json
│   │   └── ewu-2010-2013.json
│   ├── fiscal-wa-gov/            # From official bulk download
│   └── third-party/              # GovSalaries.com (incomplete)
├── processed/                    # Normalized JSON files
│   ├── uw/
│   │   ├── all-employees.json    # All UW records
│   │   └── by-year/              # Split by year
│   └── ewu/
│       ├── all-employees.json    # All EWU records
│       └── by-year/              # Split by year
└── metadata/
    ├── sources.json              # Data source documentation
    └── schema.json               # JSON schema for records
```

## Record Schema

```typescript
interface EmployeeSalary {
  id: string;              // Unique hash ID
  name: string;            // Employee name
  employer: "UW" | "EWU";  // Institution code
  employerFull: string;    // Full institution name
  position: string;        // Job title
  salary: number;          // Annual salary (USD)
  year: number;            // Calendar year
  source: string;          // Data source identifier
  lastUpdated: string;     // ISO timestamp
}
```

## Getting Current Data (2014-Present)

The data.wa.gov dataset only covers 2010-2013. For current salary data, you have two options:

### Option 1: Official Bulk Download (Recommended)

1. Visit https://fiscal.wa.gov/Staffing/Salaries
2. Click "Download Data"
3. Email will be sent with download link
4. Contains last 5 fiscal years of data
5. Place the file in `raw/fiscal-wa-gov/`
6. Run `npm run process:salaries` to normalize

### Option 2: Public Records Request

Email the UW or EWU public records office:
- UW: pubrec@uw.edu
- EWU: https://inside.ewu.edu/generalcounsel/public-records/

## NPM Scripts

```bash
# Fetch from data.wa.gov (2010-2013 data)
npm run fetch:salaries

# Fetch from GovSalaries.com (incomplete, needs fixing)
npm run fetch:salaries:govsalaries

# Process and normalize all raw data
npm run process:salaries
```

## Legal Basis

All salary data is public record under [RCW 42.56.210](https://app.leg.wa.gov/rcw/default.aspx?cite=42.56.210) (Washington Public Records Act).

### Exclusions
- Names withheld for domestic violence victims
- Employees requiring confidentiality
- Some student employment data (FERPA protected)

## Data Sources

| Source | URL | Type | Status |
|--------|-----|------|--------|
| data.wa.gov | https://data.wa.gov | API | Working |
| fiscal.wa.gov | https://fiscal.wa.gov/Staffing/Salaries | Bulk download | Manual |
| GovSalaries.com | https://govsalaries.com/state/WA | Scraping | Needs work |

## Notes

- The Power BI dashboard at fiscal.wa.gov cannot be scraped directly (uses internal Microsoft APIs)
- GovSalaries.com requires JavaScript rendering, making simple scraping difficult
- For the most complete and current data, use the fiscal.wa.gov bulk download
