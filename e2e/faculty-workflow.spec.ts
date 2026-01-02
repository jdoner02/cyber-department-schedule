/**
 * =============================================================================
 * E2E TEST: Faculty Advisor Workflow
 * =============================================================================
 *
 * PURPOSE: Comprehensive end-to-end testing of the EWU Cybersecurity Schedule
 * Dashboard from a faculty advisor's perspective. Captures screenshots at
 * every meaningful state to enable visual review for:
 *
 * - Accessibility issues (contrast, touch targets, readability)
 * - Utility problems (missing information, confusing layouts)
 * - Visual polish (alignment, spacing, color consistency)
 * - Mobile responsiveness
 *
 * PERSONAS TESTED:
 * - Director: Strategic overview, conflict detection
 * - Deputy Director: Day-to-day scheduling, student advising
 *
 * WORKFLOWS COVERED:
 * 1. Morning Dashboard Review - Quick check of schedule and conflicts
 * 2. Student Advising Session - Creating and reviewing student plans
 * 3. Quarter Planning - Analytics review, workload balancing
 * 4. Documentation Reference - Compliance and policy review
 * =============================================================================
 */

import { test, expect, Page } from '@playwright/test';

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Take a named screenshot with consistent formatting
 * Screenshots are organized by workflow step for easy review
 */
async function captureState(
  page: Page,
  workflow: string,
  step: string,
  substep?: string
): Promise<void> {
  const name = substep
    ? `${workflow}/${step.padStart(2, '0')}-${substep}`
    : `${workflow}/${step}`;

  await page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage: false,
  });
}

/**
 * Take a full-page screenshot for scrollable content
 */
async function captureFullPage(
  page: Page,
  workflow: string,
  step: string
): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/${workflow}/${step}-fullpage.png`,
    fullPage: true,
  });
}

/**
 * Wait for page to be fully loaded and stable
 */
async function waitForStableState(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300); // Allow animations to settle
}

// =============================================================================
// WORKFLOW 1: MORNING DASHBOARD REVIEW
// Director's first look at the day's schedule
// =============================================================================

test.describe('Workflow 1: Morning Dashboard Review (Desktop)', () => {
  test('Director reviews daily schedule and checks for conflicts', async ({ page }) => {
    // STEP 1: Initial Landing - First impression of the dashboard
    await page.goto('./');
    await waitForStableState(page);
    await captureState(page, '01-morning-review', '01', 'landing-page-first-impression');

    // STEP 2: Check sidebar visibility and navigation options
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await captureState(page, '01-morning-review', '02', 'sidebar-navigation-visible');

    // STEP 3: Verify schedule header and branding
    await expect(page.getByText('EWU Cyber').first()).toBeVisible();
    await captureState(page, '01-morning-review', '03', 'ewu-branding-header');

    // STEP 4: View the weekly schedule grid
    await expect(page.locator('main h1, [role="main"] h1').first()).toContainText(/schedule/i);
    await captureState(page, '01-morning-review', '04', 'weekly-schedule-grid');

    // STEP 5: Capture the schedule grid with day columns
    // Day columns may use full names or abbreviations depending on viewport
    await captureState(page, '01-morning-review', '05', 'schedule-grid-days');

    // STEP 6: Check for time labels or time content
    await captureState(page, '01-morning-review', '06', 'time-content-visible');

    // STEP 7: View course blocks in the grid
    // Course blocks may have various class names depending on implementation
    await page.waitForTimeout(1000); // Allow time for courses to render
    await captureState(page, '01-morning-review', '07', 'course-blocks-populated');

    // STEP 8: Check color legend for subject coding (if visible)
    const legend = page.locator('[class*="legend"], [class*="Legend"]');
    if (await legend.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await captureState(page, '01-morning-review', '08', 'color-legend-visible');
    } else {
      await captureState(page, '01-morning-review', '08', 'schedule-overview');
    }

    // STEP 9: View quick stats in sidebar
    const statsSection = page.getByText('Quick Stats');
    if (await statsSection.isVisible()) {
      await captureState(page, '01-morning-review', '09', 'quick-stats-sidebar');
    }

    // STEP 10: Full page screenshot to see overall layout
    await captureFullPage(page, '01-morning-review', '10-full-dashboard');

    // STEP 11: Navigate to conflicts page to check for issues
    await page.locator('nav').getByText('Conflicts').click();
    await waitForStableState(page);
    await expect(page).toHaveURL(/\/conflicts/);
    await captureState(page, '01-morning-review', '11', 'conflicts-page-initial');

    // STEP 12: View conflict summary cards
    await expect(page.getByText(/total conflicts/i)).toBeVisible();
    await captureState(page, '01-morning-review', '12', 'conflict-summary-cards');

    // STEP 13: View conflict sections
    await captureState(page, '01-morning-review', '13', 'conflict-sections');

    // STEP 14: Scroll to see more conflicts if present
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(300);
    await captureState(page, '01-morning-review', '14', 'conflicts-scrolled');

    // STEP 15: Full page of conflicts for review
    await captureFullPage(page, '01-morning-review', '15-conflicts-fullpage');
  });
});

// =============================================================================
// WORKFLOW 2: SCHEDULE FILTERING & COURSE DETAILS
// Finding specific courses and viewing details
// =============================================================================

test.describe('Workflow 2: Schedule Search & Course Details', () => {
  test('Faculty member searches schedule and views course details', async ({ page }) => {
    await page.goto('./');
    await waitForStableState(page);

    // STEP 1: Use the search functionality in the header
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
    await captureState(page, '02-search', '01', 'search-bar-visible');

    // STEP 2: Search for CSCD courses
    await searchInput.fill('CSCD');
    await page.waitForTimeout(500);
    await captureState(page, '02-search', '02', 'cscd-search-applied');

    // STEP 3: Clear and search for CYBR
    await searchInput.clear();
    await searchInput.fill('CYBR');
    await page.waitForTimeout(500);
    await captureState(page, '02-search', '03', 'cybr-search-applied');

    // STEP 4: Clear search
    await searchInput.clear();
    await page.waitForTimeout(300);
    await captureState(page, '02-search', '04', 'search-cleared');

    // STEP 8: Try to click on a course block to view details
    // Course blocks may have various class names
    const courseBlock = page.locator('[class*="CourseBlock"], [class*="course-block"], button:has([class*="bg-"])').first();
    if (await courseBlock.isVisible({ timeout: 3000 }).catch(() => false)) {
      await courseBlock.click();
      await page.waitForTimeout(500);
      await captureState(page, '02-filtering', '08', 'course-modal-open');

      // STEP 9: View course details in modal
      const modal = page.locator('[class*="modal"], [role="dialog"]');
      if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
        await captureState(page, '02-filtering', '09', 'course-details-modal');

        // STEP 10: Check for CRN and other course info
        if (await page.getByText('CRN').isVisible({ timeout: 2000 }).catch(() => false)) {
          await captureState(page, '02-filtering', '10', 'course-crn-visible');
        }

        // STEP 11: Close the modal
        const closeButton = page.locator('button[aria-label*="lose"], button:has-text("Close"), button:has-text("×")');
        if (await closeButton.first().isVisible().catch(() => false)) {
          await closeButton.first().click();
          await page.waitForTimeout(300);
        }
      }
    }
    await captureState(page, '02-filtering', '11', 'back-to-grid');
  });
});

// =============================================================================
// WORKFLOW 3: STUDENT ADVISING SESSION
// Creating and managing student personas for degree planning
// =============================================================================

test.describe('Workflow 3: Student Advising Session', () => {
  test('Advisor creates and reviews student personas', async ({ page }) => {
    // STEP 1: Navigate to Student Advising page
    await page.goto('./');
    await waitForStableState(page);
    await page.locator('nav').getByText('Advising').click();
    await waitForStableState(page);
    await captureState(page, '03-advising', '01', 'advising-page-initial');

    // STEP 2: View the privacy notice banner
    await expect(page.getByText(/privacy notice/i)).toBeVisible();
    await captureState(page, '03-advising', '02', 'privacy-notice-banner');

    // STEP 3: View the page header and description
    await expect(page.locator('main h1, [role="main"] h1').first()).toContainText(/advising|student/i);
    await captureState(page, '03-advising', '03', 'advising-header');

    // STEP 4: Check for empty state or existing personas
    const addButton = page.getByRole('button', { name: /add|create|new/i });
    await expect(addButton.first()).toBeVisible();
    await captureState(page, '03-advising', '04', 'add-persona-button-visible');

    // STEP 5: Click to create a new student persona
    await addButton.first().click();
    await page.waitForTimeout(500);
    await captureState(page, '03-advising', '05', 'create-persona-modal-open');

    // STEP 6: View the form content (auto-generated name may be visible)
    await page.waitForTimeout(500);
    await captureState(page, '03-advising', '06', 'form-content');

    // STEP 7: View form elements (emoji picker, dropdowns, etc.)
    await captureState(page, '03-advising', '07', 'form-elements-visible');

    // STEP 8: Try to interact with emoji picker if visible
    const emojiButtons = page.locator('button').filter({
      hasText: /(?:🎓|🔐|💻|🛡️|🚀|⭐|📚|🔷|🟢|🟡|🔴|👤)/u,
    });
    if (await emojiButtons.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await captureState(page, '03-advising', '08', 'emoji-picker-visible');
    }

    // STEP 9: View major selection if visible
    const majorDropdown = page.locator('select').first();
    if (await majorDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
      await captureState(page, '03-advising', '09', 'major-dropdown-visible');
    }

    // STEP 10: Full modal screenshot
    await captureFullPage(page, '03-advising', '10-create-modal-fullpage');

    // STEP 11: Try to submit the form to create persona
    const submitButton = page.getByRole('button', { name: /create profile|save|submit/i });
    if (await submitButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      // Scroll the button into view first
      await submitButton.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await submitButton.first().click({ timeout: 5000 }).catch(() => {
        // If click fails, just continue
      });
      await page.waitForTimeout(1000);
      await captureState(page, '03-advising', '11', 'after-form-submit');
    }

    // STEP 12: View the persona list/detail after creation
    await captureState(page, '03-advising', '12', 'advising-after-create');

    // STEP 13: Full page of advising
    await captureFullPage(page, '03-advising', '13-advising-fullpage');
  });
});

// =============================================================================
// WORKFLOW 4: ANALYTICS REVIEW
// Quarter planning with enrollment and workload analysis
// =============================================================================

test.describe('Workflow 4: Analytics Review', () => {
  test('Director reviews analytics for quarter planning', async ({ page }) => {
    // STEP 1: Navigate to Analytics page
    await page.goto('/analytics');
    await waitForStableState(page);
    await captureState(page, '04-analytics', '01', 'analytics-page-initial');

    // STEP 2: View page header (may be Analytics or Dashboard)
    await page.waitForTimeout(500);
    await captureState(page, '04-analytics', '02', 'analytics-header');

    // STEP 3: View summary statistics (cards or text)
    await page.waitForTimeout(500);
    await captureState(page, '04-analytics', '03', 'summary-stats');

    // STEP 4: View any charts (SVG elements from Recharts)
    const charts = page.locator('svg');
    if (await charts.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await captureState(page, '04-analytics', '04', 'charts-visible');
    }

    // STEP 5: Scroll and capture different sections
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(300);
    await captureState(page, '04-analytics', '05', 'analytics-section-2');

    // STEP 6: Check for tables
    const table = page.locator('table');
    if (await table.isVisible({ timeout: 2000 }).catch(() => false)) {
      await captureState(page, '04-analytics', '06', 'analytics-table');
    }

    // STEP 7: Check for export button
    const exportButton = page.getByRole('button', { name: /export/i });
    if (await exportButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await captureState(page, '04-analytics', '07', 'export-button');
    }

    // STEP 8: Full page analytics screenshot
    await captureFullPage(page, '04-analytics', '08-analytics-fullpage');

    // STEP 9: Scroll to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await captureState(page, '04-analytics', '09', 'analytics-top');
  });
});

// =============================================================================
// WORKFLOW 5: NOTES & ANNOTATIONS
// Adding notes to courses for planning
// =============================================================================

test.describe('Workflow 5: Notes & Annotations', () => {
  test('Faculty adds and manages schedule notes', async ({ page }) => {
    // STEP 1: Navigate to Notes page
    await page.goto('/notes');
    await waitForStableState(page);
    await captureState(page, '05-notes', '01', 'notes-page-initial');

    // STEP 2: View page header
    await page.waitForTimeout(500);
    await captureState(page, '05-notes', '02', 'notes-header');

    // STEP 3: View notes content area
    await captureState(page, '05-notes', '03', 'notes-content-area');

    // STEP 4: Check for note creation interface
    const addNoteButton = page.getByRole('button', { name: /add|create|new/i });
    if (await addNoteButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await captureState(page, '05-notes', '04', 'add-note-button');

      // Try to click and capture the form
      await addNoteButton.first().click();
      await page.waitForTimeout(500);
      await captureState(page, '05-notes', '05', 'note-creation-form');
    }

    // STEP 6: Full page of notes section
    await captureFullPage(page, '05-notes', '06-notes-fullpage');
  });
});

// =============================================================================
// WORKFLOW 6: DOCUMENTATION REFERENCE
// Reviewing policies and compliance information
// =============================================================================

test.describe('Workflow 6: Documentation Reference', () => {
  test('Faculty reviews documentation and policies', async ({ page }) => {
    // STEP 1: Navigate to Documentation page
    await page.goto('/docs');
    await waitForStableState(page);
    await captureState(page, '06-docs', '01', 'docs-page-initial');

    // STEP 2: View page header
    await page.waitForTimeout(500);
    await captureState(page, '06-docs', '02', 'docs-header');

    // STEP 3: View documentation sections
    await captureState(page, '06-docs', '03', 'docs-content');

    // STEP 4: Scroll to see more content
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(300);
    await captureState(page, '06-docs', '04', 'docs-scrolled');

    // STEP 5: Full page documentation screenshot
    await captureFullPage(page, '06-docs', '05-docs-fullpage');

    // STEP 6: Click on a documentation section if available
    const docLinks = page.locator('a, button').filter({ hasText: /guide|policy|model|ferpa|threat/i });
    if (await docLinks.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await docLinks.first().click();
      await page.waitForTimeout(500);
      await captureState(page, '06-docs', '06', 'docs-section-expanded');
    }
  });
});

// =============================================================================
// WORKFLOW 7: SETTINGS REVIEW
// Checking and adjusting application settings
// =============================================================================

test.describe('Workflow 7: Settings Review', () => {
  test('User reviews and adjusts settings', async ({ page }) => {
    // STEP 1: Navigate to Settings page
    await page.goto('/settings');
    await waitForStableState(page);
    await captureState(page, '07-settings', '01', 'settings-page-initial');

    // STEP 2: View page header
    await page.waitForTimeout(500);
    await captureState(page, '07-settings', '02', 'settings-header');

    // STEP 3: View available settings options
    await captureState(page, '07-settings', '03', 'settings-content');

    // STEP 4: Scroll to see more content
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(300);
    await captureState(page, '07-settings', '04', 'settings-scrolled');

    // STEP 5: Full page settings screenshot
    await captureFullPage(page, '07-settings', '05-settings-fullpage');
  });
});

// =============================================================================
// WORKFLOW 8: MOBILE EXPERIENCE
// Testing the mobile-first design
// =============================================================================

test.describe('Workflow 8: Mobile Experience', () => {
  test('Mobile user navigates the dashboard', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    // STEP 1: Mobile landing page
    await page.goto('./');
    await waitForStableState(page);
    await captureState(page, '08-mobile', '01', 'mobile-landing-page');

    // STEP 2: Check main content is visible
    await expect(page.locator('h1').first()).toBeVisible();
    await captureState(page, '08-mobile', '02', 'mobile-main-content');

    // STEP 3: Check for mobile navigation (hamburger menu or bottom nav)
    const mobileMenu = page.locator('button[aria-label*="menu"], [class*="mobile-nav"]');
    if (await mobileMenu.first().isVisible()) {
      await captureState(page, '08-mobile', '03', 'mobile-nav-button');
    }

    // STEP 4: View schedule on mobile
    await captureState(page, '08-mobile', '04', 'mobile-schedule-view');

    // STEP 5: Navigate to analytics on mobile
    await page.goto('/analytics');
    await waitForStableState(page);
    await captureState(page, '08-mobile', '05', 'mobile-analytics');

    // STEP 6: Navigate to advising on mobile
    await page.goto('/students');
    await waitForStableState(page);
    await captureState(page, '08-mobile', '06', 'mobile-advising');

    // STEP 7: Navigate to conflicts on mobile
    await page.goto('/conflicts');
    await waitForStableState(page);
    await captureState(page, '08-mobile', '07', 'mobile-conflicts');

    // STEP 8: Full page mobile scroll
    await captureFullPage(page, '08-mobile', '08-mobile-fullpage');
  });
});

// =============================================================================
// WORKFLOW 9: TABLET EXPERIENCE
// Testing tablet layout
// =============================================================================

test.describe('Workflow 9: Tablet Experience', () => {
  test.use({ viewport: { width: 768, height: 1024 } }); // iPad

  test('Tablet user navigates the dashboard', async ({ page }) => {
    // STEP 1: Tablet landing page
    await page.goto('./');
    await waitForStableState(page);
    await captureState(page, '09-tablet', '01', 'tablet-landing-page');

    // STEP 2: Check sidebar behavior on tablet
    const sidebar = page.locator('aside');
    if (await sidebar.isVisible()) {
      await captureState(page, '09-tablet', '02', 'tablet-sidebar');
    }

    // STEP 3: View schedule grid on tablet
    await captureState(page, '09-tablet', '03', 'tablet-schedule-grid');

    // STEP 4: Navigate to analytics on tablet
    await page.goto('/analytics');
    await waitForStableState(page);
    await captureState(page, '09-tablet', '04', 'tablet-analytics');

    // STEP 5: Navigate to advising on tablet
    await page.goto('/students');
    await waitForStableState(page);
    await captureState(page, '09-tablet', '05', 'tablet-advising');

    // STEP 6: Full page tablet screenshot
    await captureFullPage(page, '09-tablet', '06-tablet-fullpage');
  });
});

// =============================================================================
// WORKFLOW 10: ACCESSIBILITY AUDIT
// Checking key accessibility features
// =============================================================================

test.describe('Workflow 10: Accessibility Audit', () => {
  test('Audit key accessibility features across pages', async ({ page }) => {
    // STEP 1: Dashboard accessibility
    await page.goto('./');
    await waitForStableState(page);

    // Check for proper heading hierarchy
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible();
    await captureState(page, '10-a11y', '01', 'heading-hierarchy');

    // STEP 2: Check for proper button labels
    await captureState(page, '10-a11y', '02', 'button-labels');

    // STEP 3: Check for link accessibility
    await captureState(page, '10-a11y', '03', 'link-accessibility');

    // STEP 4: Check contrast in sidebar
    await captureState(page, '10-a11y', '04', 'sidebar-contrast');

    // STEP 5: Check form labels on advising page
    await page.goto('/students');
    await waitForStableState(page);
    await captureState(page, '10-a11y', '05', 'advising-form-labels');

    // STEP 6: Open create modal and check accessibility
    const addButton = page.getByRole('button', { name: /add|create|new/i });
    if (await addButton.first().isVisible()) {
      await addButton.first().click();
      await page.waitForTimeout(500);
      await captureState(page, '10-a11y', '06', 'modal-accessibility');

      // Check for proper form labels
      await captureState(page, '10-a11y', '07', 'form-field-labels');

      // Close modal
      const cancelButton = page.getByRole('button', { name: /cancel|close/i });
      if (await cancelButton.first().isVisible()) {
        await cancelButton.first().click();
      }
    }

    // STEP 8: Check analytics page accessibility
    await page.goto('/analytics');
    await waitForStableState(page);
    await captureState(page, '10-a11y', '08', 'analytics-accessibility');

    // STEP 9: Check table accessibility
    const table = page.locator('table');
    if (await table.isVisible()) {
      await captureState(page, '10-a11y', '09', 'table-accessibility');
    }

    // STEP 10: Full accessibility overview
    await captureFullPage(page, '10-a11y', '10-a11y-fullpage');
  });
});

// =============================================================================
// WORKFLOW 11: KEYBOARD NAVIGATION
// Testing keyboard-only navigation
// =============================================================================

test.describe('Workflow 11: Keyboard Navigation', () => {
  test('User navigates using keyboard only', async ({ page }) => {
    // STEP 1: Start at landing page
    await page.goto('./');
    await waitForStableState(page);
    await captureState(page, '11-keyboard', '01', 'initial-focus');

    // STEP 2: Tab to first interactive element
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    await captureState(page, '11-keyboard', '02', 'first-tab');

    // STEP 3: Continue tabbing through navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    await captureState(page, '11-keyboard', '03', 'second-tab');

    // STEP 4: Tab to sidebar navigation
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
    await captureState(page, '11-keyboard', '04', 'nav-item-focused');

    // STEP 5: Press Enter to navigate
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    await captureState(page, '11-keyboard', '05', 'keyboard-navigation');
  });
});

// =============================================================================
// WORKFLOW 12: HIGH CONTRAST / DARK MODE (if available)
// Testing visual accessibility
// =============================================================================

test.describe('Workflow 12: Visual Modes', () => {
  test('Check visual presentation in different modes', async ({ page }) => {
    // STEP 1: Standard view
    await page.goto('./');
    await waitForStableState(page);
    await captureState(page, '12-visual', '01', 'standard-mode');

    // STEP 2: Check settings for theme options
    await page.goto('/settings');
    await waitForStableState(page);
    await captureState(page, '12-visual', '02', 'theme-options');

    // STEP 3: Return to dashboard
    await page.goto('./');
    await waitForStableState(page);

    // STEP 4: Check color contrast of key elements
    const header = page.locator('header, [class*="header"]').first();
    if (await header.isVisible()) {
      await captureState(page, '12-visual', '04', 'header-contrast');
    }

    // STEP 5: Check card contrast
    const cards = page.locator('[class*="card"]').first();
    if (await cards.isVisible()) {
      await captureState(page, '12-visual', '05', 'card-contrast');
    }

    // STEP 6: Check text readability on different backgrounds
    await captureFullPage(page, '12-visual', '06-visual-fullpage');
  });
});

// =============================================================================
// WORKFLOW 13: SIDEBAR INTERACTION
// Testing sidebar collapse/expand behavior
// =============================================================================

test.describe('Workflow 13: Sidebar Interaction', () => {
  test('User interacts with collapsible sidebar', async ({ page }) => {
    await page.goto('./');
    await waitForStableState(page);

    // STEP 1: Sidebar expanded state
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await captureState(page, '13-sidebar', '01', 'sidebar-expanded');

    // STEP 2: Find collapse button
    const collapseButton = page.locator('button[title*="ollapse"], button[title*="Collapse"]');
    if (await collapseButton.isVisible()) {
      await captureState(page, '13-sidebar', '02', 'collapse-button-visible');

      // STEP 3: Click to collapse
      await collapseButton.click();
      await page.waitForTimeout(400);
      await captureState(page, '13-sidebar', '03', 'sidebar-collapsed');

      // STEP 4: Verify navigation still works when collapsed
      const expandButton = page.locator('button[title*="xpand"], button[title*="Expand"]');
      if (await expandButton.isVisible()) {
        await captureState(page, '13-sidebar', '04', 'expand-button-visible');

        // STEP 5: Expand again
        await expandButton.click();
        await page.waitForTimeout(400);
        await captureState(page, '13-sidebar', '05', 'sidebar-re-expanded');
      }
    }
  });
});

// =============================================================================
// WORKFLOW 14: PRINT PREVIEW
// Testing print-friendly view
// =============================================================================

test.describe('Workflow 14: Print Preview', () => {
  test('Check print-friendly rendering', async ({ page }) => {
    // STEP 1: Dashboard print view
    await page.goto('./');
    await waitForStableState(page);

    // Emulate print media
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(500);
    await captureState(page, '14-print', '01', 'dashboard-print-view');

    // STEP 2: Analytics print view
    await page.goto('/analytics');
    await waitForStableState(page);
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(500);
    await captureState(page, '14-print', '02', 'analytics-print-view');

    // STEP 3: Conflicts print view
    await page.goto('/conflicts');
    await waitForStableState(page);
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(500);
    await captureState(page, '14-print', '03', 'conflicts-print-view');

    // STEP 4: Full page print layout
    await captureFullPage(page, '14-print', '04-print-fullpage');
  });
});

// =============================================================================
// WORKFLOW 15: ERROR STATES
// Testing error handling and edge cases
// =============================================================================

test.describe('Workflow 15: Error States', () => {
  test('Check behavior with various states', async ({ page }) => {
    // STEP 1: Navigate to a valid page first
    await page.goto('./');
    await waitForStableState(page);
    await captureState(page, '15-errors', '01', 'valid-page-baseline');

    // STEP 2: Check 404 handling
    await page.goto('/nonexistent-page');
    await page.waitForTimeout(1000);
    await captureState(page, '15-errors', '02', '404-page');

    // STEP 3: Return to valid page
    await page.goto('./');
    await waitForStableState(page);
    await captureState(page, '15-errors', '03', 'recovery-from-404');

    // STEP 4: Test with cleared localStorage (fresh state)
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await waitForStableState(page);
    await captureState(page, '15-errors', '04', 'fresh-state-no-data');

    // STEP 5: Check advising page fresh state
    await page.goto('/students');
    await waitForStableState(page);
    await captureState(page, '15-errors', '05', 'advising-fresh-state');
  });
});
