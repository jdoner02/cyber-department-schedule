import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to fully load by checking for the sidebar
    await page.waitForSelector('aside', { timeout: 10000 });
  });

  test('should display sidebar navigation', async ({ page }) => {
    // Check sidebar is visible
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Check all main navigation items using text content
    await expect(page.locator('nav').getByText('Schedule')).toBeVisible();
    await expect(page.locator('nav').getByText('Conflicts')).toBeVisible();
    await expect(page.locator('nav').getByText('Notes')).toBeVisible();
    await expect(page.locator('nav').getByText('Analytics')).toBeVisible();
    await expect(page.locator('nav').getByText('Documentation')).toBeVisible();
    await expect(page.locator('nav').getByText('Settings')).toBeVisible();
  });

  test('should navigate to Conflicts page', async ({ page }) => {
    await page.locator('nav').getByText('Conflicts').click();

    await expect(page).toHaveURL(/\/conflicts/);
    // Use main content area h1 specifically
    await expect(page.locator('main h1, [role="main"] h1').first()).toContainText('Conflict');
  });

  test('should navigate to Notes page', async ({ page }) => {
    await page.locator('nav').getByText('Notes').click();

    await expect(page).toHaveURL(/\/notes/);
    await expect(page.locator('main h1, [role="main"] h1').first()).toContainText('Notes');
  });

  test('should navigate to Analytics page', async ({ page }) => {
    await page.locator('nav').getByText('Analytics').click();

    await expect(page).toHaveURL(/\/analytics/);
    await expect(page.locator('main h1, [role="main"] h1').first()).toContainText('Analytics');
  });

  test('should navigate to Documentation page', async ({ page }) => {
    await page.locator('nav').getByText('Documentation').click();

    await expect(page).toHaveURL(/\/docs/);
    await expect(page.locator('main h1, [role="main"] h1').first()).toContainText('Documentation');
  });

  test('should navigate to Settings page', async ({ page }) => {
    await page.locator('nav').getByText('Settings').click();

    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator('main h1, [role="main"] h1').first()).toContainText('Settings');
  });

  test('should toggle sidebar collapse', async ({ page }) => {
    // Find and click the collapse button
    const collapseButton = page.locator('button[title*="ollapse"], button:has(svg[class*="ChevronLeft"])');

    if (await collapseButton.isVisible()) {
      const sidebarBefore = await page.locator('aside').boundingBox();

      await collapseButton.click();
      await page.waitForTimeout(400); // Wait for animation

      const sidebarAfter = await page.locator('aside').boundingBox();

      // Sidebar width should have changed
      if (sidebarBefore && sidebarAfter) {
        expect(sidebarAfter.width).toBeLessThan(sidebarBefore.width);
      }
    }
  });

  test('should return to dashboard from any page', async ({ page }) => {
    // Navigate away
    await page.locator('nav').getByText('Analytics').click();
    await expect(page).toHaveURL(/\/analytics/);

    // Navigate back to dashboard
    await page.locator('nav').getByText('Schedule').click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('should display EWU branding in header', async ({ page }) => {
    // Check for EWU logo or branding in sidebar
    await expect(page.getByText('EWU Cyber').first()).toBeVisible();
    await expect(page.getByText('Schedule Dashboard').first()).toBeVisible();
  });

  test('should show quick stats in sidebar', async ({ page }) => {
    // Check for quick stats section
    const statsSection = page.getByText('Quick Stats');
    if (await statsSection.isVisible()) {
      await expect(page.getByText(/Total Courses/i)).toBeVisible();
    }
  });
});
