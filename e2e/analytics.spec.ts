import { test, expect } from '@playwright/test';

test.describe('Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./analytics');
    await page.waitForTimeout(1000);
  });

  test('should display analytics dashboard', async ({ page }) => {
    // The main content h1 says "Analytics Dashboard"
    await expect(page.getByRole('heading', { name: /analytics dashboard/i })).toBeVisible();
    // Check for term information
    await expect(page.getByText(/term:/i)).toBeVisible();
  });

  test('should show summary cards', async ({ page }) => {
    // Check for summary statistics in the main section (using exact matches to avoid duplicates)
    const main = page.locator('main');
    await expect(main.locator('div').filter({ hasText: /^Courses$/ }).first()).toBeVisible();
    await expect(main.locator('div').filter({ hasText: /^Seats Filled$/ }).first()).toBeVisible();
    await expect(main.locator('div').filter({ hasText: /^Seats Offered$/ }).first()).toBeVisible();
  });

  test('should display enrollment chart', async ({ page }) => {
    // Chart title is "Seats Filled vs Remaining by Subject"
    await expect(page.getByText(/seats filled vs remaining/i)).toBeVisible();

    // Recharts creates SVG elements - wait for any img (Recharts uses role=img for SVG)
    await expect(page.locator('[role="img"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display faculty workload chart', async ({ page }) => {
    const workloadSection = page.locator('[class*="card"]').filter({ hasText: /faculty.*workload|workload/i });
    await expect(workloadSection.first()).toBeVisible();
  });

  test('should display delivery method pie chart', async ({ page }) => {
    const deliverySection = page.locator('[class*="card"]').filter({ hasText: /delivery/i });
    await expect(deliverySection.first()).toBeVisible();
  });

  test('should display time distribution chart', async ({ page }) => {
    const timeSection = page.locator('[class*="card"]').filter({ hasText: /time.*distribution/i });
    await expect(timeSection.first()).toBeVisible();
  });

  test('should display subject breakdown table', async ({ page }) => {
    // Look for the subject breakdown table
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Check for table headers
    await expect(page.getByRole('columnheader', { name: /subject/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /courses/i })).toBeVisible();
  });

  test('should show export CSV button', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export csv/i });
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeEnabled();
  });

  test('should display correct subject data in table', async ({ page }) => {
    // Check that CSCD and CYBR are in the table
    const table = page.locator('table');
    await expect(table.getByText('CSCD')).toBeVisible();
    await expect(table.getByText('CYBR')).toBeVisible();
  });

  test('should show fill rate percentages', async ({ page }) => {
    // Look for Fill Rate column header
    const fillRateColumn = page.getByRole('columnheader', { name: /fill rate/i });
    await expect(fillRateColumn).toBeVisible();

    // There should be percentage values in the table
    const percentages = page.locator('td').filter({ hasText: /%/ });
    await expect(percentages.first()).toBeVisible();
  });

  test('should have chart elements', async ({ page }) => {
    // Verify charts are rendered (Recharts uses role=img for SVG)
    const chartImages = page.locator('[role="img"]');
    await expect(chartImages.first()).toBeVisible({ timeout: 10000 });

    // Verify at least one chart exists
    expect(await chartImages.count()).toBeGreaterThan(0);
  });
});
