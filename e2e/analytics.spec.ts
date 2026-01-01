import { test, expect } from '@playwright/test';

test.describe('Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForTimeout(1000);
  });

  test('should display analytics dashboard', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Analytics');
    await expect(page.getByText(/comprehensive.*analytics/i)).toBeVisible();
  });

  test('should show summary cards', async ({ page }) => {
    // Check for summary statistics cards
    await expect(page.getByText(/courses/i).first()).toBeVisible();
    await expect(page.getByText(/enrolled/i).first()).toBeVisible();
    await expect(page.getByText(/capacity/i).first()).toBeVisible();
  });

  test('should display enrollment chart', async ({ page }) => {
    // Look for chart container
    const chartSection = page.locator('[class*="card"]').filter({ hasText: /enrollment/i });
    await expect(chartSection.first()).toBeVisible();

    // Recharts creates SVG elements
    await expect(page.locator('svg').first()).toBeVisible();
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

  test('should show utilization percentages', async ({ page }) => {
    // Look for percentage values in the table
    const utilColumn = page.getByRole('columnheader', { name: /utilization/i });
    await expect(utilColumn).toBeVisible();

    // There should be percentage values
    const percentages = page.locator('td').filter({ hasText: /%/ });
    await expect(percentages.first()).toBeVisible();
  });

  test('should have interactive chart tooltips', async ({ page }) => {
    // Hover over a chart to trigger tooltip
    const chart = page.locator('svg').first();
    await chart.hover();

    // Wait a bit for tooltip
    await page.waitForTimeout(500);
  });
});
