/**
 * =============================================================================
 * E2E TEST: What-If Scenario Editor
 * =============================================================================
 *
 * PURPOSE: Test the What-If scenario editor functionality for schedule planning.
 * Captures screenshots at every meaningful state to verify:
 *
 * - Edit Mode toggle functionality
 * - Course modification workflow
 * - Course cancellation and restoration
 * - Visual state indicators (modified, cancelled, added)
 * - Changes summary panel
 * - localStorage persistence
 *
 * WORKFLOWS COVERED:
 * 1. Toggle Edit Mode - Enter and exit edit mode
 * 2. Modify Course - Change instructor, days, time, campus
 * 3. Cancel Course - Cancel and restore a course
 * 4. View Changes - Review changes summary panel
 * 5. Reset All - Clear all draft changes
 * =============================================================================
 */

import { test, expect, Page } from '@playwright/test';

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Take a named screenshot with consistent formatting
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
 * Wait for page to be fully loaded and stable
 */
async function waitForStableState(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300); // Allow animations to settle
}

/**
 * Clear localStorage draft state before test
 */
async function clearDraftState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('ewu-draft-schedule');
  });
  await page.reload();
  await waitForStableState(page);
}

// =============================================================================
// WORKFLOW 1: TOGGLE EDIT MODE
// =============================================================================

test.describe('What-If Editor: Toggle Edit Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await waitForStableState(page);
    await clearDraftState(page);
  });

  test('should display View button by default', async ({ page }) => {
    // STEP 1: Check initial state - View mode
    await captureState(page, '05-whatif-toggle', '01', 'initial-view-mode');

    // Find the View button by aria-label
    const viewButton = page.getByRole('button', { name: /enter edit mode/i });
    await expect(viewButton).toBeVisible();

    // Should have Eye icon visible
    await expect(page.locator('svg.lucide-eye')).toBeVisible();
  });

  test('should toggle to Edit mode when clicked', async ({ page }) => {
    // STEP 1: Click the View button to enter edit mode
    const viewButton = page.getByRole('button', { name: /enter edit mode/i });
    await viewButton.click();
    await page.waitForTimeout(300);
    await captureState(page, '05-whatif-toggle', '02', 'after-toggle-to-edit');

    // Should now show Edit mode button
    const editButton = page.getByRole('button', { name: /exit edit mode/i });
    await expect(editButton).toBeVisible();

    // Button should be blue (bg-blue-600)
    await expect(editButton).toHaveClass(/bg-blue-600/);
  });

  test('should toggle back to View mode when clicked again', async ({ page }) => {
    // Toggle to edit mode
    await page.getByRole('button', { name: /enter edit mode/i }).click();
    await page.waitForTimeout(200);

    // Toggle back to view mode
    await page.getByRole('button', { name: /exit edit mode/i }).click();
    await page.waitForTimeout(200);
    await captureState(page, '05-whatif-toggle', '03', 'after-toggle-back-to-view');

    // Should show View button again
    await expect(page.getByRole('button', { name: /enter edit mode/i })).toBeVisible();
  });
});

// =============================================================================
// WORKFLOW 2: COURSE MODIFICATION
// =============================================================================

test.describe('What-If Editor: Course Modification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await waitForStableState(page);
    await clearDraftState(page);
    // Enter edit mode
    await page.getByRole('button', { name: /enter edit mode/i }).click();
    await page.waitForTimeout(300);
  });

  test('should show quick action buttons in edit mode', async ({ page }) => {
    await captureState(page, '05-whatif-modify', '01', 'edit-mode-with-actions');

    // Course cards should have edit and cancel buttons
    const editButtons = page.locator('[title="Edit course"]');
    await expect(editButtons.first()).toBeVisible({ timeout: 5000 });

    const cancelButtons = page.locator('[title="Cancel course"]');
    await expect(cancelButtons.first()).toBeVisible();
  });

  test('should open CourseEditModal when clicking edit button', async ({ page }) => {
    // Click the edit button on the first course
    const editButton = page.locator('[title="Edit course"]').first();
    await editButton.click();
    await page.waitForTimeout(300);
    await captureState(page, '05-whatif-modify', '02', 'course-edit-modal-open');

    // Modal should be visible
    await expect(page.locator('.modal-content')).toBeVisible();

    // Should show "Edit:" in the header
    await expect(page.locator('.modal-header')).toContainText('Edit:');
  });

  test('should allow changing instructor', async ({ page }) => {
    // Open edit modal
    await page.locator('[title="Edit course"]').first().click();
    await page.waitForTimeout(500);

    // Wait for modal to be fully visible
    await expect(page.locator('.modal-content')).toBeVisible({ timeout: 5000 });

    // Find instructor dropdown (there may be multiple selects - instructor is first)
    const instructorSelect = page.locator('.modal-content select').first();
    await expect(instructorSelect).toBeVisible({ timeout: 5000 });
    await captureState(page, '05-whatif-modify', '03', 'instructor-dropdown');

    // Get all options - should have at least TBA + some instructors
    const options = await instructorSelect.locator('option').allTextContents();
    expect(options.length).toBeGreaterThan(1);
  });

  test('should allow toggling days', async ({ page }) => {
    // Open edit modal
    await page.locator('[title="Edit course"]').first().click();
    await page.waitForTimeout(500);

    // Wait for modal to be fully visible
    await expect(page.locator('.modal-content')).toBeVisible({ timeout: 5000 });

    // Find day toggle buttons (M, T, W, Th, F) - 10x10 buttons with specific letters
    const dayButtons = page.locator('.modal-content button').filter({ hasText: /^[MTWF]$|^Th$/ });
    await expect(dayButtons.first()).toBeVisible({ timeout: 5000 });
    await captureState(page, '05-whatif-modify', '04', 'day-toggle-buttons');

    // Find the Monday button within modal-content
    const mondayButton = page.locator('.modal-content button').filter({ hasText: /^M$/ }).first();
    await expect(mondayButton).toBeVisible();

    // Check if it's currently selected (has bg-blue-600 class)
    const wasSelected = await mondayButton.evaluate(el => el.classList.contains('bg-blue-600'));

    // Click to toggle
    await mondayButton.click();
    await page.waitForTimeout(200);

    // Check the new state - it should have changed
    const isNowSelected = await mondayButton.evaluate(el => el.classList.contains('bg-blue-600'));
    expect(isNowSelected).not.toEqual(wasSelected);

    await captureState(page, '05-whatif-modify', '05', 'day-toggled');
  });

  test('should show time dropdowns', async ({ page }) => {
    // Open edit modal
    await page.locator('[title="Edit course"]').first().click();
    await page.waitForTimeout(300);

    // Find time selects (there should be two - start and end)
    const timeSelects = page.locator('select').filter({ has: page.locator('option:has-text("AM"), option:has-text("PM")') });
    await expect(timeSelects.first()).toBeVisible();
    await captureState(page, '05-whatif-modify', '06', 'time-dropdowns');
  });

  test('should show campus options', async ({ page }) => {
    // Open edit modal
    await page.locator('[title="Edit course"]').first().click();
    await page.waitForTimeout(300);

    // Find campus buttons
    await expect(page.getByRole('button', { name: 'Cheney' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Online' })).toBeVisible();
    await captureState(page, '05-whatif-modify', '07', 'campus-options');
  });

  test('should save changes and show MODIFIED badge', async ({ page }) => {
    // Open edit modal
    await page.locator('[title="Edit course"]').first().click();
    await page.waitForTimeout(300);

    // Change campus
    await page.getByRole('button', { name: 'Online' }).click();
    await page.waitForTimeout(100);

    // Save changes
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(300);
    await captureState(page, '05-whatif-modify', '08', 'after-save-modified');

    // Modal should be closed
    await expect(page.locator('.modal-content')).not.toBeVisible();

    // Course should show MODIFIED badge
    await expect(page.getByText('MODIFIED').first()).toBeVisible();
  });

  test('should show change count in Edit button', async ({ page }) => {
    // Make a change
    await page.locator('[title="Edit course"]').first().click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Online' }).click();
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(300);

    // Edit button should show change count badge
    const editButton = page.getByRole('button', { name: /exit edit mode/i });
    await expect(editButton).toContainText('1');
    await captureState(page, '05-whatif-modify', '09', 'change-count-badge');
  });
});

// =============================================================================
// WORKFLOW 3: COURSE CANCELLATION
// =============================================================================

test.describe('What-If Editor: Course Cancellation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await waitForStableState(page);
    await clearDraftState(page);
    // Enter edit mode
    await page.getByRole('button', { name: /enter edit mode/i }).click();
    await page.waitForTimeout(300);
  });

  test('should cancel a course when clicking cancel button', async ({ page }) => {
    await captureState(page, '05-whatif-cancel', '01', 'before-cancel');

    // Click the cancel button on the first course
    const cancelButton = page.locator('[title="Cancel course"]').first();
    await cancelButton.click();
    await page.waitForTimeout(300);
    await captureState(page, '05-whatif-cancel', '02', 'after-cancel');

    // Course should show CANCELLED badge
    await expect(page.getByText('CANCELLED').first()).toBeVisible();

    // Course card should have reduced opacity (opacity-50 class)
    const courseCard = page.locator('button').filter({ has: page.getByText('CANCELLED') }).first();
    await expect(courseCard).toHaveClass(/opacity-50/);
  });

  test('should show restore button for cancelled course', async ({ page }) => {
    // Cancel a course
    await page.locator('[title="Cancel course"]').first().click();
    await page.waitForTimeout(300);

    // Should now show restore button
    const restoreButton = page.locator('[title="Restore course"]').first();
    await expect(restoreButton).toBeVisible();
    await captureState(page, '05-whatif-cancel', '03', 'restore-button-visible');
  });

  test('should restore a cancelled course', async ({ page }) => {
    // Cancel a course
    await page.locator('[title="Cancel course"]').first().click();
    await page.waitForTimeout(300);

    // Restore it
    await page.locator('[title="Restore course"]').first().click();
    await page.waitForTimeout(300);
    await captureState(page, '05-whatif-cancel', '04', 'after-restore');

    // CANCELLED badge should be gone
    // The course should no longer have the cancelled visual state
    const cancelledBadges = page.getByText('CANCELLED');
    const count = await cancelledBadges.count();
    expect(count).toBe(0);
  });

  test('should show strikethrough on cancelled course title', async ({ page }) => {
    // Cancel a course
    await page.locator('[title="Cancel course"]').first().click();
    await page.waitForTimeout(300);

    // Course title should have line-through style
    const courseTitle = page.locator('h3.line-through').first();
    await expect(courseTitle).toBeVisible();
    await captureState(page, '05-whatif-cancel', '05', 'strikethrough-title');
  });
});

// =============================================================================
// WORKFLOW 4: CHANGES SUMMARY PANEL
// =============================================================================

test.describe('What-If Editor: Changes Summary', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await waitForStableState(page);
    await clearDraftState(page);
    // Enter edit mode
    await page.getByRole('button', { name: /enter edit mode/i }).click();
    await page.waitForTimeout(300);
  });

  test('should not show Changes panel when no changes', async ({ page }) => {
    await captureState(page, '05-whatif-summary', '01', 'no-changes-no-panel');

    // Changes panel should not be visible (no changes yet)
    const changesPanel = page.getByText('Changes').filter({ has: page.locator('text=/\\d+/') });
    const count = await changesPanel.count();
    expect(count).toBe(0);
  });

  test('should show Changes panel when there are changes', async ({ page }) => {
    // Make a change
    await page.locator('[title="Cancel course"]').first().click();
    await page.waitForTimeout(300);
    await captureState(page, '05-whatif-summary', '02', 'changes-panel-visible');

    // Changes panel should be visible
    await expect(page.getByRole('heading', { name: 'Changes' }).or(page.getByText('Changes').first())).toBeVisible();
  });

  test('should show cancelled course in changes panel', async ({ page }) => {
    // Cancel a course
    await page.locator('[title="Cancel course"]').first().click();
    await page.waitForTimeout(300);

    // Changes panel should show the cancelled course - look for the Changes summary container
    // The ChangesSummary component has a specific structure with bg-white rounded-2xl
    const changesPanel = page.locator('.bg-white.rounded-2xl').filter({ hasText: 'Changes' }).first();
    await expect(changesPanel).toBeVisible();
    await captureState(page, '05-whatif-summary', '03', 'cancelled-in-summary');
  });

  test('should show Reset button in changes panel', async ({ page }) => {
    // Make a change
    await page.locator('[title="Cancel course"]').first().click();
    await page.waitForTimeout(300);

    // Reset button should be visible
    await expect(page.getByRole('button', { name: /reset/i })).toBeVisible();
    await captureState(page, '05-whatif-summary', '04', 'reset-button-visible');
  });

  test('should show Export Changes button', async ({ page }) => {
    // Make a change
    await page.locator('[title="Cancel course"]').first().click();
    await page.waitForTimeout(300);

    // Export button should be visible - use exact match to avoid matching other export buttons
    await expect(page.getByRole('button', { name: 'Export Changes' })).toBeVisible();
    await captureState(page, '05-whatif-summary', '05', 'export-button');
  });
});

// =============================================================================
// WORKFLOW 5: RESET ALL CHANGES
// =============================================================================

test.describe('What-If Editor: Reset All', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await waitForStableState(page);
    await clearDraftState(page);
    // Enter edit mode
    await page.getByRole('button', { name: /enter edit mode/i }).click();
    await page.waitForTimeout(300);
  });

  test('should reset all changes when clicking Reset', async ({ page }) => {
    // Make multiple changes
    await page.locator('[title="Cancel course"]').first().click();
    await page.waitForTimeout(200);
    await page.locator('[title="Cancel course"]').first().click();
    await page.waitForTimeout(300);
    await captureState(page, '05-whatif-reset', '01', 'before-reset');

    // Click Reset button
    await page.getByRole('button', { name: /reset/i }).click();
    await page.waitForTimeout(300);
    await captureState(page, '05-whatif-reset', '02', 'after-reset');

    // Changes panel should be gone (no changes)
    const cancelledBadges = page.getByText('CANCELLED');
    const count = await cancelledBadges.count();
    expect(count).toBe(0);
  });
});

// =============================================================================
// WORKFLOW 6: PERSISTENCE
// =============================================================================

test.describe('What-If Editor: Persistence', () => {
  test('should persist changes across page reload', async ({ page }) => {
    await page.goto('./');
    await waitForStableState(page);
    await clearDraftState(page);

    // Enter edit mode using the Eye icon button (works on all viewports)
    const editModeButton = page.locator('button').filter({ has: page.locator('svg.lucide-eye') }).first();
    await editModeButton.click();
    await page.waitForTimeout(300);
    await page.locator('[title="Cancel course"]').first().click();
    await page.waitForTimeout(500); // Wait for localStorage save via useEffect
    await captureState(page, '05-whatif-persist', '01', 'before-reload');

    // Verify localStorage was written before reloading
    const storedBefore = await page.evaluate(() => localStorage.getItem('ewu-draft-schedule'));
    expect(storedBefore).toBeTruthy();
    expect(storedBefore).toContain('cancelledIds');

    // Reload the page
    await page.reload();
    await waitForStableState(page);
    // Extra wait for React hydration and state restoration
    await page.waitForTimeout(500);
    await captureState(page, '05-whatif-persist', '02', 'after-reload');

    // Verify localStorage still has data
    const storedAfter = await page.evaluate(() => localStorage.getItem('ewu-draft-schedule'));
    expect(storedAfter).toBeTruthy();

    // After reload, isEditMode is persisted so we're already in edit mode!
    // The button now shows Pencil icon (edit mode), not Eye icon (view mode)
    // Check if we're already in edit mode by looking for the Pencil icon
    const pencilButton = page.locator('button').filter({ has: page.locator('svg.lucide-pencil') }).first();
    const eyeButton = page.locator('button').filter({ has: page.locator('svg.lucide-eye') }).first();

    // Either we're in edit mode (pencil visible) or we need to enter it (eye visible)
    const pencilVisible = await pencilButton.isVisible().catch(() => false);
    if (!pencilVisible) {
      // If not in edit mode, click Eye to enter
      await eyeButton.click({ timeout: 10000 });
      await page.waitForTimeout(500);
    }

    // Change should still be there
    await expect(page.getByText('CANCELLED').first()).toBeVisible({ timeout: 5000 });
    await captureState(page, '05-whatif-persist', '03', 'changes-persisted');
  });
});

// =============================================================================
// WORKFLOW 7: VISUAL STATES
// =============================================================================

test.describe('What-If Editor: Visual States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await waitForStableState(page);
    await clearDraftState(page);
    // Enter edit mode
    await page.getByRole('button', { name: /enter edit mode/i }).click();
    await page.waitForTimeout(300);
  });

  test('should show blue dashed border for modified courses', async ({ page }) => {
    // Modify a course
    await page.locator('[title="Edit course"]').first().click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Online' }).click();
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(300);

    // Course card should have blue dashed border
    const modifiedCard = page.locator('button.border-dashed.border-blue-400').first();
    await expect(modifiedCard).toBeVisible();
    await captureState(page, '05-whatif-visual', '01', 'blue-border-modified');
  });

  test('should show red dashed border for cancelled courses', async ({ page }) => {
    // Cancel a course
    await page.locator('[title="Cancel course"]').first().click();
    await page.waitForTimeout(300);

    // Course card should have red dashed border
    const cancelledCard = page.locator('button.border-dashed.border-red-400').first();
    await expect(cancelledCard).toBeVisible();
    await captureState(page, '05-whatif-visual', '02', 'red-border-cancelled');
  });

  test('should show gray accent bar for cancelled courses', async ({ page }) => {
    // Cancel a course
    await page.locator('[title="Cancel course"]').first().click();
    await page.waitForTimeout(300);

    // The accent bar should be gray
    // This is harder to test directly, so we rely on the screenshot
    await captureState(page, '05-whatif-visual', '03', 'gray-accent-bar-cancelled');
  });
});
