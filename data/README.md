# Project Data (EWU Cyber Department Schedule)

## Executive Overview

This `data/` directory is the on-disk data lake for the **EWU Cyber Department Schedule** project. It contains point-in-time JSON snapshots from **official EWU-facing systems** (and a small amount of related public data) that support:

- Schedule visualization and analysis (sections, meeting times, instructors, enrollment, delivery method)
- Catalog-aware context (credits, descriptions, prerequisites, stable course links)
- Advising/program context (structured program requirements scraped from the catalog)
- Date context (quarter start/end, finals, breaks, holidays)

### Where the Data Comes From

- **EWU Schedule (Banner / Ellucian schedule search):** JSON responses saved from the same schedule search system used for EWU public class schedules. These files contain one record per **section** (CRN) with meeting times, instructor roster, enrollment, and delivery metadata.
- **EWU Catalog (`catalog.ewu.edu`):** Course listing pages and program pages. Course listing snapshots provide authoritative course metadata (titles, credits, descriptions, prerequisite text, and stable deep links). Program requirement snapshots describe degree/minor structures (core courses, elective groups, etc.).
- **EWU Academic Calendar:** Snapshot derived from EWU’s published academic calendar feed (25Live RSS).
- **Washington State salary data (optional/supporting dataset):** Public salary records for EWU/UW (documented separately in `data/salaries/README.md`).

This repository is **not** an EWU system-of-record; the files here are **snapshots** captured for analysis and tooling.

## Term Codes (EWU Banner)

EWU uses a 6-digit term code: `YYYYTT`

- `YYYY` = calendar year
- `TT` = quarter code:
  - `10` = Winter
  - `20` = Spring
  - `30` = Summer
  - `40` = Fall

Examples:

- `202610` = Winter 2026
- `202620` = Spring 2026
- `202540` = Fall 2025

## Directory Structure

```
data/
├── README.md
├── input/                             # Planning + sourcing checklists (human-maintained)
├── schedules/                          # EWU schedule snapshots (Banner schedule search JSON)
│   ├── raw/                            # Raw schedule-search responses (as captured)
│   │   ├── 202440/                     # Fall 2024 (YYYYTT)
│   │   ├── 202510/                     # Winter 2025
│   │   └── ...                         # More terms as collected
│   └── processed/                      # Generated, deduplicated per-term schedules
│       ├── 202440/
│       │   └── schedule.json
│       └── ...
├── trends/                             # Derived cross-term aggregates (generated)
│   └── schedule-trends.json            # Per-term/per-subject/per-course aggregates
├── catalog/
│   ├── course-listings/                # Course listings from catalog.ewu.edu
│   │   └── 2025-2026/                  # Catalog edition (as published by catalog.ewu.edu)
│   │       ├── CSCD/                   # Subject code
│   │       ├── MATH/
│   │       └── PHYS/
│   ├── mappings/
│   │   └── course-aliases.json         # Canonical course identity (e.g., CSCD 330 → CYBR 330)
│   └── programs/                       # Program requirement JSON scraped from catalog.ewu.edu program pages
│       └── 2024-2025/                  # Catalog year the scrape targets
├── calendar/
│   └── 2024-2025/
│       └── academic-calendar.json      # Term dates, breaks, holidays (derived from 25Live RSS)
└── salaries/                           # Public salary dataset (see data/salaries/README.md)
```

## Data Dictionary

### 1) EWU Schedules (`data/schedules/raw/<TERM_CODE>/*.json`)

**What it is:** Raw schedule-search JSON responses from EWU’s Banner/Ellucian schedule system.

See `data/schedules/README.md` for the full schedule dataset layout and naming rules.

**Structure:**

- Raw snapshots live under `data/schedules/raw/<TERM_CODE>/` (term folders use `YYYYTT`).
- Generated, deduplicated per-term schedules live under `data/schedules/processed/<TERM_CODE>/schedule.json` (built by `npm run build:schedules`).
- The UI loads schedules from `public/data/terms/<TERM_CODE>.json` (also built by `npm run build:schedules`).

**Raw snapshot filename convention:**

- `kebab-case.json` (no spaces/underscores)
- Name reflects the query captured (examples: `cscd.json`, `engl-musc.json`, `subjects-a.json`)
- `schedule.json` is reserved for **generated** outputs (do not use it for raw captures)

**Top-level schema:** `BannerDataResponse`

```ts
// Minimal required shape for raw schedule snapshots.
// (Raw files often include additional Banner metadata fields like page sizes, offsets, etc.)
export interface BannerDataResponse {
  success: boolean;      // True when the schedule search request succeeded.
  totalCount: number;    // Total number of section records included in `data`.
  data: BannerCourse[];  // One object per section (CRN).
}
```

#### `BannerCourse` (one row per section / CRN)

```ts
export interface BannerCourse {
  // Identity / term
  id: number;                     // Banner internal identifier for the section row.
  term: string;                   // Term code (e.g., "202620").
  termDesc: string;               // Human label (e.g., "Spring Quarter 2026").
  courseReferenceNumber: string;  // CRN (unique per section per term).
  partOfTerm: string;             // Part-of-term code (often "1").

  // Course + section identity
  subject: string;                // Subject code (e.g., "CSCD", "CYBR").
  subjectDescription: string;     // Subject name (e.g., "Computer Science").
  courseNumber: string;           // Catalog course number (e.g., "210").
  courseDisplay: string;          // Display number (often same as `courseNumber`).
  sequenceNumber: string;         // Section number (e.g., "001").
  subjectCourse: string;          // Concatenated code (e.g., "CSCD210").

  // Descriptions
  courseTitle: string;            // Section/course title.
  scheduleTypeDescription: string; // Meeting pattern/type (e.g., "Lecture", "Lab").

  // Campus / delivery
  campusDescription: string;       // Campus label (e.g., "Cheney", "Online").
  instructionalMethod: string;     // Banner instructional method code (varies by institution).
  instructionalMethodDescription: string; // Human label for instructional method.

  // Credits
  creditHours: number | null;      // Exact credit hours if fixed (may be null).
  creditHourLow: number | null;    // Low end of credit range (if variable credit).
  creditHourHigh: number | null;   // High end of credit range (if variable credit).
  creditHourIndicator: string | null; // Indicator for variable/fixed credits (Banner-specific).

  // Enrollment / capacity
  maximumEnrollment: number; // Max seats.
  enrollment: number;        // Current enrollment.
  seatsAvailable: number;    // Seats remaining.
  waitCapacity: number;      // Waitlist max.
  waitCount: number;         // Current waitlist count.
  waitAvailable: number;     // Waitlist spots remaining.

  // Cross listing
  crossList: string | null;          // Cross-list identifier (if any).
  crossListCapacity: number | null;  // Cross-list combined capacity (if any).
  crossListCount: number | null;     // Cross-list combined enrollment (if any).
  crossListAvailable: number | null; // Cross-list seats remaining (if any).

  // Section status / linking
  openSection: boolean;         // True if registration is open.
  linkIdentifier: string | null; // Identifier used to link co-requisite sections (if present).
  isSectionLinked: boolean;     // True if this section participates in a linked set.

  // Optional/supplemental fields
  reservedSeatSummary: string | null;           // Human summary of reserved seating rules (if provided).
  sectionAttributes: BannerSectionAttribute[];  // Section-level attributes (e.g., ZTC, gen-ed tags).

  // Instructor + meeting data
  faculty: BannerFaculty[];                  // Faculty roster for the section (may be empty).
  meetingsFaculty: BannerMeetingsFaculty[];  // Meeting patterns, each with its own faculty + time.
}
```

#### `BannerFaculty`

```ts
export interface BannerFaculty {
  bannerId: string;           // Instructor identifier in Banner (treat as sensitive).
  displayName: string;        // Name as shown in schedule search.
  emailAddress: string;       // Email (if present in the source).
  primaryIndicator: boolean;  // True if this instructor is primary.

  // Banner linkage fields
  term: string;
  courseReferenceNumber: string;
  class: string;              // Banner internal “class” group field.
  category: string | null;    // Faculty category (Banner-specific; may be null).
}
```

#### `BannerMeetingsFaculty` + `BannerMeetingTime`

```ts
export interface BannerMeetingsFaculty {
  term: string;
  courseReferenceNumber: string;
  class: string;              // Banner meeting “class” grouping.
  category: string;           // Meeting category (Banner-specific).
  faculty: BannerFaculty[];   // Faculty for this specific meeting pattern.
  meetingTime: BannerMeetingTime;
}

export interface BannerMeetingTime {
  // When
  startDate: string;          // YYYY-MM-DD
  endDate: string;            // YYYY-MM-DD
  beginTime: string | null;   // Typically HHMM (24-hour), null for arranged/TBA.
  endTime: string | null;     // Typically HHMM (24-hour), null for arranged/TBA.

  // Days of week
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;

  // Where
  building: string | null;            // Building code (e.g., "PAT").
  buildingDescription: string | null; // Building name (e.g., "Patterson Hall").
  room: string | null;                // Room number.
  campus: string | null;              // Campus code (if provided).
  campusDescription: string | null;   // Campus label (if provided).

  // Type / classification
  meetingType: string;            // Meeting type code.
  meetingTypeDescription: string; // Human label for meeting type.
  meetingScheduleType: string;    // Schedule type code (Banner-specific).
  category: string;
  class: string;
  term: string;
  courseReferenceNumber: string;

  // Workload estimates (Banner-specific; may vary by section type)
  creditHourSession: number;
  hoursWeek: number;
}
```

#### `BannerSectionAttribute`

```ts
export interface BannerSectionAttribute {
  termCode: string;              // Term code (e.g., "202620").
  courseReferenceNumber: string; // CRN.
  class: string;
  code: string;                  // Attribute code.
  description: string;           // Attribute label.
  isZTCAttribute: boolean;       // True when the attribute indicates Zero Textbook Cost.
}
```

**Notes**

- Some schedule snapshot files may be empty or incomplete depending on how they were collected. For example, `data/schedules/raw/202620/subjects-k.json` is currently 0 bytes.

---

### 1b) Course Identity Mappings (`data/catalog/mappings/course-aliases.json`)

**What it is:** A human-maintained mapping that defines **canonical course identities** for longitudinal analysis when the same course appears under multiple subject codes (e.g., CSCD → CYBR) or is cross-listed.

**Why it exists:** Banner schedule snapshots use the *in-term* subject code. For department trend reporting, we sometimes need to treat multiple subject-coded rows as the “same course” over time.

**Schema:** `CourseAliasMapFile` (see `src/types/trends.ts`)

Key fields:

- `entries[].canonicalCourseCode`: Canonical identity (used for trend grouping)
- `entries[].aliases`: Historical/cross-listed codes that should roll up to the canonical identity
- `entries[].type` + `entries[].notes`: Rationale and audit trail

---

### 1c) Schedule Trends Dataset (`data/trends/schedule-trends.json`)

**What it is:** A generated aggregate dataset built from `data/schedules/processed/**` that powers the UI’s cross-term trend charts.

**Runtime copy:** `public/data/trends/schedule-trends.json` (served to the browser).

**Generator script:** `npm run build:trends` (`scripts/build-trends.ts`)

**Schema:** `ScheduleTrendsDataset` (see `src/types/trends.ts`)

Key parts:

- `terms[]`: Which terms are covered (ordered)
- `subjects[]`: Raw subject codes discovered in the snapshots
- `departmentTrends[]`: Per-term/per-subject totals (sections, capacity, enrollment)
- `courseTrends[]`: Per-term/per-canonical-course totals (supports alias rollups like CSCD 330 → CYBR 330)

---

### 2) Course Listings (`data/catalog/course-listings/**`)

**What it is:** Snapshots of EWU’s official course listing pages from `https://catalog.ewu.edu/course-listings/...`, normalized into a consistent JSON structure.

**Schema:** `CatalogCourseListingsFile`

```ts
export interface CatalogCourseListingsFile {
  schemaVersion: string; // File format version for this dataset (not the EWU catalog edition).
  catalog: {
    institution: string;  // "Eastern Washington University"
    edition: string;      // Catalog edition as published (e.g., "2025-2026")
    college: string;      // College name
    department: string;   // Department name
    subjectCode: string;  // Subject code (e.g., "CSCD")
    source: {
      listing_url: string;        // Catalog listing URL for the subject
      retrieved_at: string;       // YYYY-MM-DD
      deep_link_pattern: string;  // Pattern for stable per-course links (catalog search endpoint)
      notes?: string;             // Human notes about collection/limitations
    };
    fields: string[];       // Field names expected in `courses[]`
    courses: CatalogCourse[];
    level_filter?: string;  // e.g., "100-level" (if file represents a filtered subset)
    course_count?: number;  // Number of courses in `courses[]`
  };
}

export interface CatalogCourse {
  code: string;                 // e.g., "CSCD 210"
  number: number;               // e.g., 210
  title: string;                // Course title (catalog capitalization may vary)
  credits: string;              // Credits text (e.g., "5" or "1-5")
  description_summary?: string; // Short summary captured from catalog
  description?: string;         // Full description (when available)
  prerequisites?: string;       // Prerequisite text (verbatim/near-verbatim)
  corequisites?: string;        // Corequisite text
  notes?: string;               // Misc notes
  satisfies?: string;           // Gen-ed/designation text (if captured)
  links: {
    search: string;             // Stable per-course link: https://catalog.ewu.edu/search/?P=SUBJ%20NNN
    listing_fallback?: string;  // Subject listing page fallback
    listing_highlight?: string; // Optional highlight link (if captured)
  };
}
```

---

### 3) Program Requirements (`data/catalog/programs/**`)

**What it is:** Degree/minor requirement summaries scraped from EWU catalog program pages (e.g., `https://catalog.ewu.edu/stem/cs-ee/...`). These are structured (core courses, elective groups, supporting courses) so the app can reason about requirements.

**Schema:** `DegreeProgram` (matches `src/types/advising.ts`)

```ts
export interface DegreeProgram {
  slug: string;        // URL slug / file key
  name: string;        // Display name
  degreeType: 'BS' | 'BA' | 'BCS' | 'MS' | 'Minor' | 'Certificate';
  department: string;

  totalCredits: number;
  minimumGPA: number;
  minimumMajorGPA?: number;

  coreCourses: CourseRequirement[];
  electiveGroups: ElectiveGroup[];
  supportCourses: CourseRequirement[];
  specialRequirements: string[];
  planOfStudy?: PlanOfStudy;

  catalogUrl: string;   // Source page
  catalogYear: string;  // e.g., "2024-2025"
  lastUpdated: string;  // ISO timestamp
}

export interface CourseRequirement {
  courseCode: string;     // e.g., "CSCD 210"
  title: string;
  credits: number;
  type: 'core' | 'major-required' | 'major-elective' | 'support' | 'lab' | 'gen-ed' | 'capstone';
  prerequisites: string[];
  corequisites: string[];
  minimumGrade: string;     // e.g., "C"
  typicalQuarters: string[]; // e.g., ["fall","winter","spring"]
  typicalCampuses: string[]; // e.g., ["Cheney","Online"]
  notes?: string;
}

export interface ElectiveGroup {
  id: string;
  name: string;
  description: string;
  requiredCount: number;
  requiredCredits: number;
  courses: CourseRequirement[];
}

export interface PlanOfStudy {
  name: string;
  quarters: PlanQuarter[];
  totalCredits: number;
  notes?: string;
}

export interface PlanQuarter {
  termLabel: string;
  year: number;
  quarter: 'fall' | 'winter' | 'spring' | 'summer';
  courses: string[];
  totalCredits: number;
  notes?: string;
}
```

**Implementation note:** The frontend currently loads program JSON from `src/data/catalog/programs/*.json`; the copies under `data/catalog/programs/<catalogYear>/` are organized “data lake” snapshots.

---

### 4) Academic Calendar (`data/calendar/**`)

**What it is:** Term dates, finals windows, breaks, and holidays for EWU’s quarter system.

**Schema:** `AcademicCalendar`

```ts
export interface AcademicCalendar {
  academicYear: string;  // e.g., "2024-2025"
  institution: string;   // "Eastern Washington University"
  system: 'quarter';
  weeksPerTerm: number;  // Typical instructional weeks

  dataSource: string;    // Source URL (RSS feed)
  lastUpdated: string;   // YYYY-MM-DD

  quarters: {
    id: string;          // e.g., "winter-2026"
    name: string;        // e.g., "Winter 2026"
    startDate: string;   // YYYY-MM-DD
    endDate: string;     // YYYY-MM-DD
    finalsStart: string; // YYYY-MM-DD
    finalsEnd: string;   // YYYY-MM-DD
    weeks: number;       // Instructional weeks for that quarter
  }[];

  breaks: {
    name: string;
    startDate: string;   // YYYY-MM-DD
    endDate: string;     // YYYY-MM-DD
    academicYear: string;
  }[];

  holidays: {
    name: string;
    date: string;        // YYYY-MM-DD
    noClass?: boolean;   // When specified, indicates no classes
    academicYear?: string;
  }[];
}
```

---

### 5) Salaries (`data/salaries/**`)

See `data/salaries/README.md` for the authoritative structure, sources, and schemas.

Key record type (normalized):

```ts
interface EmployeeSalary {
  id: string;
  name: string;
  employer: 'UW' | 'EWU';
  employerFull: string;
  position: string;
  salary: number;       // USD
  year: number;
  source: string;
  lastUpdated: string;  // ISO timestamp
}
```
