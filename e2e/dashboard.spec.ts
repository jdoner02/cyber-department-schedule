import { test, expect } from '@playwright/test';

test.describe('Dashboard - Schedule Grid', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    // Wait for the schedule overview to load
    await page.waitForTimeout(1000);
  });

  test('should display the main dashboard with schedule overview', async ({ page }) => {
    // Check page title and header
    await expect(page.getByRole('heading', { name: /schedule overview/i })).toBeVisible();

    // Check that day tabs are visible
    await expect(page.getByRole('button', { name: /monday/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /tuesday/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /wednesday/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /thursday/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /friday/i })).toBeVisible();
  });

  test('should display course cards in the grid', async ({ page }) => {
    // Check that at least some course cards are visible (they are buttons with aria-labels)
    const courseCards = page.locator('button[aria-label*="CSCD"], button[aria-label*="CYBR"]');
    await expect(courseCards.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show time information on course cards', async ({ page }) => {
    // Check for time labels on course cards
    await expect(page.getByText(/\d+:\d+ [AP]M/i).first()).toBeVisible();
  });

  test('should display quick stats in sidebar', async ({ page }) => {
    // Check that quick stats are visible
    await expect(page.getByText('Total Courses')).toBeVisible();
    await expect(page.getByText('CSCD').first()).toBeVisible();
    await expect(page.getByText('CYBR').first()).toBeVisible();
  });

  test('should open course detail modal when clicking a course', async ({ page }) => {
    // Find and click a course card
    const courseCard = page.locator('button[aria-label*="CSCD"], button[aria-label*="CYBR"]').first();
    await courseCard.click();

    // Modal should appear with course details
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Check for CRN label within the modal (to avoid matching course cards)
    await expect(modal.getByText('CRN')).toBeVisible();

    // Close the modal by clicking close button or pressing Escape
    await page.keyboard.press('Escape');

    // Modal should be closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });

  test('should navigate to notes page when clicking Add Note button', async ({ page }) => {
    // Find and click a course card
    const courseCard = page.locator('button[aria-label*="CSCD"], button[aria-label*="CYBR"]').first();
    await courseCard.click();

    // Modal should appear
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Click the Add Note button
    await modal.getByRole('button', { name: /add note/i }).click();

    // Should navigate to notes page
    await expect(page).toHaveURL(/\/notes/);

    // Notes form should be visible (auto-opened when coming from course modal)
    await expect(page.getByText(/create new note/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Dashboard - Day Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.waitForTimeout(1000);
  });

  test('should switch between days', async ({ page }) => {
    // Click Tuesday
    await page.getByRole('button', { name: /tuesday/i }).click();
    await page.waitForTimeout(300);

    // Click Wednesday
    await page.getByRole('button', { name: /wednesday/i }).click();
    await page.waitForTimeout(300);

    // The day tabs should still be visible
    await expect(page.getByRole('button', { name: /monday/i })).toBeVisible();
  });

  test('should show course count badges on day tabs', async ({ page }) => {
    // Day tabs should show course counts
    const mondayTab = page.getByRole('button', { name: /monday/i });
    await expect(mondayTab).toBeVisible();
    // The tab should contain a number (course count)
    await expect(mondayTab).toContainText(/\d+/);
  });
});

test.describe('Dashboard - Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.waitForTimeout(1000);
  });

  test('should search for courses', async ({ page }) => {
    // Find the search input in header
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();

    // Type in search
    await searchInput.fill('CSCD 300');

    // Wait for filter to apply
    await page.waitForTimeout(500);
  });
});

test.describe('Dashboard - Responsive Design', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('./');
    await page.waitForTimeout(1000);

    // Schedule overview heading should be visible
    await expect(page.getByRole('heading', { name: /schedule overview/i })).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('./');
    await page.waitForTimeout(1000);

    await expect(page.getByRole('heading', { name: /schedule overview/i })).toBeVisible();
  });
});

test.describe('Dashboard - Header Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.waitForTimeout(1000);
  });

  test('should display term selector', async ({ page }) => {
    // Look for the term selector dropdown
    const termSelector = page.getByRole('combobox', { name: /select term/i });
    await expect(termSelector).toBeVisible();
  });

  test('should display action buttons', async ({ page }) => {
    // Check for import, export, print, refresh buttons
    await expect(page.getByText('Import')).toBeVisible();
    await expect(page.getByText('Export')).toBeVisible();
    await expect(page.getByText('Print')).toBeVisible();
  });

  test('should show course count in header', async ({ page }) => {
    // Header should show course count
    await expect(page.getByText(/\d+ courses loaded/i)).toBeVisible();
  });
});
