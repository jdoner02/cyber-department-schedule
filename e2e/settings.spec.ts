import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./settings');
    await page.waitForTimeout(500);
  });

  test('should display settings page', async ({ page }) => {
    // The main content h1 (not the header)
    await expect(page.locator('main h1')).toContainText('Settings');
    await expect(page.getByText(/manage data.*preferences/i)).toBeVisible();
  });

  test('should display data management section', async ({ page }) => {
    await expect(page.getByText(/data management/i)).toBeVisible();
    await expect(page.getByText(/current schedule data/i)).toBeVisible();
  });

  test('should show current data info', async ({ page }) => {
    // Check for data info labels (the labels and values are combined)
    const dataSection = page.locator('.card').filter({ hasText: 'Current Schedule Data' });
    await expect(dataSection).toBeVisible();
    await expect(dataSection.getByText(/courses loaded/i)).toBeVisible();
    await expect(dataSection.getByText(/data source/i)).toBeVisible();
  });

  test('should show local storage stats', async ({ page }) => {
    // Find the Local Storage heading within the Data Management card
    const dataCard = page.locator('.card').filter({ hasText: 'Data Management' });
    await expect(dataCard.getByRole('heading', { name: /Local Storage/i })).toBeVisible();
    await expect(dataCard.getByText(/notes saved/i)).toBeVisible();
    await expect(dataCard.getByText(/custom presets/i)).toBeVisible();
  });

  test('should show import button', async ({ page }) => {
    // Import is a label wrapping a file input
    const importLabel = page.locator('label[for="settings-file-import"]');
    await expect(importLabel).toBeVisible();
    // File input should exist but be hidden
    const fileInput = page.locator('#settings-file-import');
    await expect(fileInput).toBeAttached();
  });

  test('should show export all data button', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export all data/i });
    await expect(exportButton).toBeVisible();
  });

  test('should show export notes only button', async ({ page }) => {
    const exportNotesButton = page.getByRole('button', { name: /export notes/i });
    await expect(exportNotesButton).toBeVisible();
  });

  test('should show clear data button', async ({ page }) => {
    const clearButton = page.getByRole('button', { name: /clear.*data/i });
    await expect(clearButton).toBeVisible();
  });

  test('should show confirmation when clearing data', async ({ page }) => {
    const clearButton = page.getByRole('button', { name: /clear.*data/i });
    await clearButton.click();

    // Confirmation should appear
    await expect(page.getByText(/are you sure/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /yes.*clear/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
  });

  test('should cancel clear data operation', async ({ page }) => {
    await page.getByRole('button', { name: /clear.*data/i }).click();
    await page.getByRole('button', { name: /cancel/i }).click();

    // Confirmation should be hidden
    await expect(page.getByText(/are you sure/i)).not.toBeVisible();
  });

  test('should clear data and navigate to root', async ({ page }) => {
    // Click clear button
    await page.getByRole('button', { name: /clear.*data/i }).click();

    // Confirm
    await page.getByRole('button', { name: /yes.*clear/i }).click();

    // Should navigate to root (not stay on /settings)
    // The URL should end with the base path (not /settings)
    await page.waitForURL(/\/cyber-department-schedule\/$/);
    // Verify we're on the main dashboard
    await expect(page.getByText(/schedule overview/i)).toBeVisible();
  });

  test('should display security section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Security' })).toBeVisible();
    await expect(page.getByText(/environment mode/i)).toBeVisible();
  });

  test('should show local/public mode indicator', async ({ page }) => {
    // Should show either LOCAL or PUBLIC badge
    const badge = page.locator('[class*="badge"]').filter({ hasText: /local|public/i });
    await expect(badge.first()).toBeVisible();
  });

  test('should display secure mode features when local', async ({ page }) => {
    // If running locally, secure mode features should be shown
    const localBadge = page.locator('[class*="badge"]').filter({ hasText: /local/i });

    if (await localBadge.isVisible()) {
      await expect(page.getByText(/secure mode features/i)).toBeVisible();
      await expect(page.getByText(/student tracking/i)).toBeVisible();
      await expect(page.getByText(/encrypted storage/i)).toBeVisible();
    }
  });

  test('should display display settings section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Display' })).toBeVisible();
    await expect(page.getByText(/color theme/i)).toBeVisible();
  });

  test('should show EWU brand colors', async ({ page }) => {
    await expect(page.getByText('EWU Brand Colors')).toBeVisible();

    // Check for color swatches in the Display section (not mobile menu button)
    const displayCard = page.locator('.card').filter({ hasText: 'Color Theme' });
    const redSwatch = displayCard.locator('[class*="bg-ewu-red"]');
    await expect(redSwatch).toBeVisible();
  });

  test('should display about section', async ({ page }) => {
    await expect(page.getByText('About')).toBeVisible();
    await expect(page.getByText(/ewu cyber schedule dashboard/i)).toBeVisible();
    // Use more specific regex to avoid matching "Show Stacked Versions"
    await expect(page.getByText(/version \d+\.\d+\.\d+/i)).toBeVisible();
  });

  test('should show schedule grid info', async ({ page }) => {
    await expect(page.getByText(/schedule grid/i)).toBeVisible();
    await expect(page.getByText(/hours displayed|7:00 am.*10:00 pm/i)).toBeVisible();
  });

  test('should display footer with copyright', async ({ page }) => {
    await expect(page.getByText(/eastern washington university/i).first()).toBeVisible();
    await expect(page.getByText(/all rights reserved/i)).toBeVisible();
  });
});

// Schedule Filtering Section Tests
test.describe('Settings - Schedule Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./settings');
    await page.waitForTimeout(500);
  });

  test('should display schedule filtering section', async ({ page }) => {
    await expect(page.getByText('Schedule Filtering')).toBeVisible();
    await expect(page.getByText(/visible subjects/i)).toBeVisible();
  });

  test('should show all three subject checkboxes', async ({ page }) => {
    // CSCD, CYBR, and MATH checkboxes
    await expect(page.getByText('CSCD').first()).toBeVisible();
    await expect(page.getByText('CYBR').first()).toBeVisible();
    await expect(page.getByText('MATH').first()).toBeVisible();
    await expect(page.getByText(/computer science/i).first()).toBeVisible();
    await expect(page.getByText(/cybersecurity/i).first()).toBeVisible();
    await expect(page.getByText(/mathematics/i).first()).toBeVisible();
  });

  test('should have CSCD and CYBR checked by default', async ({ page }) => {
    const filteringSection = page.locator('.card').filter({ hasText: 'Schedule Filtering' });

    // CSCD checkbox
    const cscdCheckbox = filteringSection.locator('input[type="checkbox"]').first();
    await expect(cscdCheckbox).toBeChecked();

    // CYBR checkbox
    const cybrCheckbox = filteringSection.locator('input[type="checkbox"]').nth(1);
    await expect(cybrCheckbox).toBeChecked();

    // MATH checkbox should be unchecked by default
    const mathCheckbox = filteringSection.locator('input[type="checkbox"]').nth(2);
    await expect(mathCheckbox).not.toBeChecked();
  });

  test('should toggle MATH subject visibility', async ({ page }) => {
    const filteringSection = page.locator('.card').filter({ hasText: 'Schedule Filtering' });
    const mathCheckbox = filteringSection.locator('input[type="checkbox"]').nth(2);

    // Initially unchecked
    await expect(mathCheckbox).not.toBeChecked();

    // Click to enable MATH
    await mathCheckbox.click();
    await expect(mathCheckbox).toBeChecked();

    // Click again to disable
    await mathCheckbox.click();
    await expect(mathCheckbox).not.toBeChecked();
  });

  test('should prevent unchecking last subject', async ({ page }) => {
    const filteringSection = page.locator('.card').filter({ hasText: 'Schedule Filtering' });

    // Uncheck CYBR first
    const cybrCheckbox = filteringSection.locator('input[type="checkbox"]').nth(1);
    await cybrCheckbox.click();
    await expect(cybrCheckbox).not.toBeChecked();

    // Now CSCD should be the only one checked - it should be disabled
    const cscdCheckbox = filteringSection.locator('input[type="checkbox"]').first();
    await expect(cscdCheckbox).toBeChecked();
    await expect(cscdCheckbox).toBeDisabled();
  });

  test('should display program filter section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Program Filter/i })).toBeVisible();
    await expect(page.getByText(/optionally filter courses/i)).toBeVisible();
  });

  test('should show program filter dropdown', async ({ page }) => {
    // The dropdown has the first option "All Courses (no program filter)"
    const programDropdown = page.locator('select').filter({ has: page.locator('option', { hasText: /all courses/i }) });
    await expect(programDropdown).toBeVisible();
  });

  test('should have program categories in dropdown', async ({ page }) => {
    const programDropdown = page.locator('select').filter({ has: page.locator('option', { hasText: /all courses/i }) });

    // Check for optgroups - use locator that looks at the HTML structure
    const options = await programDropdown.locator('option').allTextContents();
    expect(options.some(opt => opt.includes('BS'))).toBeTruthy();
    expect(options.some(opt => opt.includes('MS'))).toBeTruthy();
    expect(options.some(opt => opt.includes('Minor'))).toBeTruthy();
  });

  test('should select a program filter', async ({ page }) => {
    const programDropdown = page.locator('select').filter({ has: page.locator('option', { hasText: /all courses/i }) });

    // Select a BS program - use the actual option text from the snapshot
    await programDropdown.selectOption({ label: 'Computer Science, BS' });

    // Warning banner should appear
    await expect(page.getByText(/program filter active/i)).toBeVisible();
  });

  test('should show reset to defaults button', async ({ page }) => {
    const resetButton = page.getByRole('button', { name: /reset to defaults/i });
    await expect(resetButton).toBeVisible();
    await expect(page.getByText(/resets subject visibility/i)).toBeVisible();
  });

  test('should reset settings to defaults', async ({ page }) => {
    const filteringSection = page.locator('.card').filter({ hasText: 'Schedule Filtering' });

    // Enable MATH first
    const mathCheckbox = filteringSection.locator('input[type="checkbox"]').nth(2);
    await mathCheckbox.click();
    await expect(mathCheckbox).toBeChecked();

    // Select a program
    const programDropdown = page.locator('select').filter({ hasText: /all courses/i });
    await programDropdown.selectOption({ index: 1 }); // Select first program

    // Click reset
    const resetButton = page.getByRole('button', { name: /reset to defaults/i });
    await resetButton.click();

    // MATH should be unchecked again
    await expect(mathCheckbox).not.toBeChecked();

    // Program dropdown should be reset to "All Courses"
    await expect(programDropdown).toHaveValue('');
  });

  test('should persist subject settings across page reload', async ({ page }) => {
    const filteringSection = page.locator('.card').filter({ hasText: 'Schedule Filtering' });

    // Enable MATH
    const mathCheckbox = filteringSection.locator('input[type="checkbox"]').nth(2);
    await mathCheckbox.click();
    await expect(mathCheckbox).toBeChecked();

    // Reload page
    await page.reload();
    await page.waitForTimeout(500);

    // MATH should still be checked
    const mathCheckboxAfter = page.locator('.card').filter({ hasText: 'Schedule Filtering' }).locator('input[type="checkbox"]').nth(2);
    await expect(mathCheckboxAfter).toBeChecked();
  });

  test('should apply subject filter to dashboard', async ({ page }) => {
    const filteringSection = page.locator('.card').filter({ hasText: 'Schedule Filtering' });

    // Enable MATH
    const mathCheckbox = filteringSection.locator('input[type="checkbox"]').nth(2);
    await mathCheckbox.click();

    // Go to dashboard
    await page.goto('./');
    await page.waitForTimeout(1000);

    // Should see the sidebar with Quick Stats including MATH
    // MATH should be visible in the sidebar stats
    await expect(page.getByText('MATH').first()).toBeVisible({ timeout: 5000 });
  });
});

// JSON Import/Export Instructions Section Tests
test.describe('Settings - JSON Import/Export Instructions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./settings');
    await page.waitForTimeout(500);
  });

  test('should display updating schedule data section', async ({ page }) => {
    await expect(page.getByText('Updating Schedule Data')).toBeVisible();
    await expect(page.getByText(/how to update schedule data/i)).toBeVisible();
  });

  test('should show step-by-step instructions', async ({ page }) => {
    await expect(page.getByText(/export your schedule data from banner/i)).toBeVisible();
    await expect(page.getByText(/import schedule/i).first()).toBeVisible();
  });

  test('should show local development path', async ({ page }) => {
    await expect(page.getByText('public/data/schedule.json')).toBeVisible();
  });

  test('should show copy path button', async ({ page }) => {
    // Find the copy button near the path
    const copyButton = page.locator('button[title="Copy path"]');
    await expect(copyButton).toBeVisible();
  });

  test('should copy path to clipboard when clicked', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-write', 'clipboard-read']);

    const copyButton = page.locator('button[title="Copy path"]');
    await copyButton.click();

    // Check icon changes to checkmark
    await expect(page.locator('button[title="Copy path"]').locator('svg[class*="text-green"]')).toBeVisible();
  });

  test('should show expected JSON format', async ({ page }) => {
    await expect(page.getByText('Expected JSON Format')).toBeVisible();
    await expect(page.getByText(/"success": true/)).toBeVisible();
    await expect(page.getByText(/"data":/)).toBeVisible();
  });

  test('should show academic calendar info', async ({ page }) => {
    await expect(page.getByText(/academic calendar feed/i)).toBeVisible();
    await expect(page.getByText('academic-calendar-quarter.rss')).toBeVisible();
    await expect(page.getByText('npm run fetch:calendar')).toBeVisible();
  });
});

// Debug Options Section Tests
test.describe('Settings - Debug Options', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./settings');
    await page.waitForTimeout(500);
  });

  test('should display debug options section', async ({ page }) => {
    await expect(page.getByText('Debug Options')).toBeVisible();
    await expect(page.getByText(/advanced options for inspecting/i)).toBeVisible();
  });

  test('should show stacked versions toggle', async ({ page }) => {
    await expect(page.getByText('Show Stacked Versions')).toBeVisible();
    await expect(page.getByText(/display 500-level cross-listed courses/i)).toBeVisible();
  });

  test('should toggle stacked versions on and off', async ({ page }) => {
    const debugSection = page.locator('.card').filter({ hasText: 'Debug Options' });
    const stackedCheckbox = debugSection.locator('input[type="checkbox"]').first();

    // Get current state
    const initialState = await stackedCheckbox.isChecked();

    // Toggle the checkbox
    await stackedCheckbox.click();

    // Verify it changed
    if (initialState) {
      await expect(stackedCheckbox).not.toBeChecked();
    } else {
      await expect(stackedCheckbox).toBeChecked();
      // Active badge should appear when checked
      await expect(page.getByText('Active').first()).toBeVisible();
      // Warning banner should appear
      await expect(page.getByText(/debug mode active/i)).toBeVisible();
    }

    // Toggle back
    await stackedCheckbox.click();

    // Verify it reverted
    if (initialState) {
      await expect(stackedCheckbox).toBeChecked();
    } else {
      await expect(stackedCheckbox).not.toBeChecked();
    }
  });

  test('should persist stacked versions setting across reload', async ({ page }) => {
    const debugSection = page.locator('.card').filter({ hasText: 'Debug Options' });
    const stackedCheckbox = debugSection.locator('input[type="checkbox"]').first();

    // Get current state and set to checked
    const initialState = await stackedCheckbox.isChecked();
    if (!initialState) {
      await stackedCheckbox.click();
    }
    await expect(stackedCheckbox).toBeChecked();

    // Reload page
    await page.reload();
    await page.waitForTimeout(500);

    // Should still be checked after reload
    const stackedCheckboxAfter = page.locator('.card').filter({ hasText: 'Debug Options' }).locator('input[type="checkbox"]').first();
    await expect(stackedCheckboxAfter).toBeChecked();
  });

  test('should verify reset button exists and is clickable', async ({ page }) => {
    // Click reset to defaults to verify it works
    const resetButton = page.getByRole('button', { name: /reset to defaults/i });
    await expect(resetButton).toBeVisible();
    await resetButton.click();

    // Wait for React state to update
    await page.waitForTimeout(300);

    // The reset button resets subject visibility and program filter
    // Debug options like showStackedVersions are maintained (intentional for debugging)
    await expect(resetButton).toBeVisible();
  });
});

// Stacked Course Display Tests
test.describe('Settings - Stacked Course Display', () => {
  test('should navigate to dashboard when stacked versions enabled', async ({ page }) => {
    await page.goto('./settings');
    await page.waitForTimeout(500);

    const debugSection = page.locator('.card').filter({ hasText: 'Debug Options' });
    const stackedCheckbox = debugSection.locator('input[type="checkbox"]').first();

    // Enable stacked versions if not already
    if (!(await stackedCheckbox.isChecked())) {
      await stackedCheckbox.click();
    }
    await expect(stackedCheckbox).toBeChecked();

    // Go to dashboard
    await page.goto('./');
    await page.waitForTimeout(1000);

    // Dashboard should be visible with course content
    const courseSection = page.locator('main');
    await expect(courseSection).toBeVisible();
    await expect(page.getByText(/schedule overview/i)).toBeVisible();
  });
});
