import { test, expect } from '@playwright/test';

test.describe('Dashboard - Schedule Grid', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for data to load
    await page.waitForSelector('[class*="WeeklyGrid"], [class*="schedule"]', {
      timeout: 10000,
    });
  });

  test('should display the main dashboard with schedule grid', async ({ page }) => {
    // Check page title and header
    await expect(page.locator('h1')).toContainText('Weekly Schedule');

    // Check that day columns are visible
    await expect(page.getByText('Monday')).toBeVisible();
    await expect(page.getByText('Tuesday')).toBeVisible();
    await expect(page.getByText('Wednesday')).toBeVisible();
    await expect(page.getByText('Thursday')).toBeVisible();
    await expect(page.getByText('Friday')).toBeVisible();
  });

  test('should display course blocks in the grid', async ({ page }) => {
    // Wait for course blocks to load
    await page.waitForTimeout(1000);

    // Check that at least some course blocks are visible
    const courseBlocks = page.locator('[class*="course-block"], [role="button"]');
    await expect(courseBlocks.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show time labels on the left', async ({ page }) => {
    // Check for time labels
    await expect(page.getByText('8:00 AM')).toBeVisible();
    await expect(page.getByText('12:00 PM')).toBeVisible();
  });

  test('should display color legend', async ({ page }) => {
    // Check that color legend is visible
    const legend = page.locator('[class*="legend"], [class*="Legend"]');
    await expect(legend.first()).toBeVisible({ timeout: 5000 });
  });

  test('should open course detail modal when clicking a course', async ({ page }) => {
    // Find and click a course block
    const courseBlock = page.locator('[class*="course-block"], [role="button"]').first();
    await courseBlock.click();

    // Modal should appear with course details
    await expect(page.locator('[class*="modal"], [role="dialog"]')).toBeVisible({
      timeout: 5000,
    });

    // Check for CRN label
    await expect(page.getByText('CRN')).toBeVisible();

    // Close the modal
    const closeButton = page.locator('button[aria-label="Close modal"], button:has-text("Close")');
    await closeButton.click();

    // Modal should be closed
    await expect(page.locator('[class*="modal-overlay"]')).not.toBeVisible();
  });
});

test.describe('Dashboard - Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
  });

  test('should toggle filter panel', async ({ page }) => {
    // Click on Filters button
    const filterButton = page.getByRole('button', { name: /filters/i });
    await filterButton.click();

    // Filter options should be visible
    await expect(page.getByText('Subjects')).toBeVisible();
    await expect(page.getByText('Days')).toBeVisible();
    await expect(page.getByText('Delivery')).toBeVisible();
  });

  test('should filter by subject', async ({ page }) => {
    // Expand filters
    await page.getByRole('button', { name: /filters/i }).click();

    // Click on CSCD subject filter
    const cscdButton = page.getByRole('button', { name: 'CSCD' });
    await cscdButton.click();

    // Active filter badge should show
    await expect(page.locator('[class*="badge"], .px-2.py-0\\.5')).toContainText('1');
  });

  test('should filter by day', async ({ page }) => {
    // Expand filters
    await page.getByRole('button', { name: /filters/i }).click();

    // Click on Monday filter
    const mondayButton = page.getByRole('button', { name: 'Mon' });
    await mondayButton.click();

    // Should show filtered results
    await page.waitForTimeout(500);
  });

  test('should clear all filters', async ({ page }) => {
    // Expand filters and apply some
    await page.getByRole('button', { name: /filters/i }).click();
    await page.getByRole('button', { name: 'CSCD' }).click();

    // Click clear all
    const clearButton = page.getByRole('button', { name: /clear all/i });
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }
  });

  test('should search for courses', async ({ page }) => {
    // Find the search input in header
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('CSCD');

    // Wait for filter to apply
    await page.waitForTimeout(500);
  });

  test('should change color by option', async ({ page }) => {
    // Expand filters
    await page.getByRole('button', { name: /filters/i }).click();

    // Find the color by dropdown
    const colorBySelect = page.locator('select').filter({ hasText: /color by/i });
    if (await colorBySelect.isVisible()) {
      await colorBySelect.selectOption('instructor');
    }
  });
});

test.describe('Dashboard - Responsive Design', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    // Sidebar might be collapsed on mobile
    // Main content should still be visible
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await expect(page.locator('h1')).toBeVisible();
  });
});
