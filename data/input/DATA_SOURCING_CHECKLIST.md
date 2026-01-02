# Data Sourcing Checklist (EWU Schedule + Catalog + Calendar)

This file is a **pomodoro-ready checklist** for sourcing and maintaining the datasets that power the EWU Cyber Department Schedule project.

## What We Have Today (inventory)

### 1) Schedule snapshots (Banner schedule search JSON)
- Terms with per-subject snapshots (12 subjects each): `202440`, `202510`, `202520`, `202540`, `202610`
  - Subjects present: `acct`, `biol`, `busn`, `chem`, `cscd`, `cybr`, `desn`, `eeng`, `engl-musc`, `geos`, `math`, `phys`
- Spring 2026 (`202620`) has a **multi-file split** snapshot: `data/schedules/raw/202620/subjects-*.json`

Where it lives:
- Raw archive: `data/schedules/raw/<TERM_CODE>/...`
- App default runtime file: `public/data/schedule.json`

### 2) Catalog snapshots (catalog.ewu.edu)
- Course listings (2025–2026): `data/catalog/course-listings/2025-2026/{CSCD,MATH,PHYS}/*-level.json`
- Program requirements (2024–2025): `data/catalog/programs/2024-2025/*.json`

### 3) Academic calendar (25Live)
- RSS snapshot: `public/data/academic-calendar-quarter.rss`
- Derived term-date snapshot: `data/calendar/2024-2025/academic-calendar.json`

### 4) Optional supporting dataset
- WA salary datasets and schemas: `data/salaries/*`

## What We Do *Not* Have Yet (gaps)

- We do **not** have “all courses for all departments for all terms”.
  - Our schedule snapshots cover a limited set of subjects for a handful of terms.
  - Course listings only cover a few subjects (CSCD/MATH/PHYS) for one catalog year edition.
  - Program requirements only cover a couple programs.

## What We Know We Can Gather Reliably

- **Banner schedule search JSON** for any term + subject (repeatable, structured, consistent schema).
- **25Live academic calendar RSS/XML** (repeatable; snapshotting needed for the frontend due to CORS).
- **EWU catalog HTML pages** for course listings + program requirements (repeatable scraping; may need updates when catalog layout changes).

## Pomodoro Blocks (20–25 minutes each)

### A) Schedule snapshots (Banner → JSON)
- [ ] Pick a target term code (e.g., `202640`) and 1–3 subject codes to capture.
- [ ] Export 1 subject’s schedule JSON from Banner (keep the raw response intact).
- [ ] Save to `data/schedules/raw/<TERM_CODE>/<slug>.json` (kebab-case; avoid underscores/spaces; reserve `schedule.json` for generated files).
- [ ] Quick validation: confirm the JSON has top-level `success`, `totalCount`, and `data` array.
- [ ] Spot-check 2–3 records: `term`, `courseReferenceNumber`, `subject`, `courseNumber`, `meetingsFaculty`.

Repeat per subject until the term has the coverage you want.

### B) Promote a snapshot to the app (optional)
- [ ] Choose the “active” snapshot you want the UI to load.
- [ ] Copy it to `public/data/schedule.json`.
- [ ] Run `npm test` to ensure parsing/analytics still pass.
- [ ] Smoke-check locally: `npm run dev` → verify counts + meeting times render.

### C) Academic calendar refresh (25Live → RSS snapshot)
- [ ] Update the local RSS snapshot: `npm run fetch:calendar`
- [ ] Verify the file exists and looks valid XML: `public/data/academic-calendar-quarter.rss`
- [ ] Smoke-check in UI: Dashboard → **Academic Calendar** card shows events.

### D) Program requirements refresh (catalog → structured JSON)
- [ ] List known program scrapers: `npm run scrape:catalog:list`
- [ ] Scrape one program: `npm run scrape:catalog -- --program <slug>`
- [ ] Confirm output lands in `src/data/catalog/programs/` and loads in the Students page.

### E) Course listings expansion (catalog → subject listings)
- [ ] Pick 1 subject (e.g., `CYBR`) + 1 catalog year edition (e.g., `2025-2026`).
- [ ] Create the directory: `data/catalog/course-listings/<catalog-year>/<SUBJECT>/`
- [ ] Capture/scrape 100-level page → save `100-level.json` (repeat for 200/300/400/500/600 as applicable).
- [ ] Spot-check: each entry has course code, title, credits, description, and URL (consistent fields).

### F) Advising “gotchas” review (before registration opens)
- [ ] Review any persona marked “Due soon” in Students → Registration Prep.
- [ ] Check for cross-campus days (Cheney + Spokane U-District) and allow travel time.
- [ ] Avoid tight building-to-building turns (e.g., Kingston ↔ CEB) where possible.
- [ ] Balance difficult courses across quarters (avoid stacking multiple heavy courses).

### G) Maintain course identity aliases (CSCD ↔ CYBR transitions)
- [ ] Pick one course you need to track longitudinally (e.g., `CYBR 330`).
- [ ] Confirm the historical/cross-listed codes in Banner snapshots (e.g., `CSCD 330`).
- [ ] Update `data/catalog/mappings/course-aliases.json` with canonical + aliases + notes.
- [ ] Rebuild trends: `npm run build:trends` and verify `/trends` shows the combined history.

### H) Build/update quarterly trends dataset
- [ ] Run `npm run build:trends` (reads `data/schedules/processed/**`, writes `public/data/trends/schedule-trends.json`).
- [ ] Open `/trends` and verify:
  - Department chart changes as you switch departments/metrics.
  - Course chart for `CYBR 330` shows history and lists `CSCD 330` as an alias.

## “Next Data” Ideas (nice-to-have, but not required)

- Full subject coverage per term (all departments).
- Building metadata (coordinates / walking time graph) to automate “back-to-back travel stress” warnings.
- Course difficulty heuristics (historical DFW rates, credit load, modality).
- Real-time seat/enrollment publishing checks (when Banner updates seat counts during registration).
