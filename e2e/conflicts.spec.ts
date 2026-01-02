import { test, expect } from '@playwright/test';

test.describe('Conflicts Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./conflicts');
    await page.waitForTimeout(1000);
  });

  test('should display conflict detection page', async ({ page }) => {
    // The main content h1 says "Conflict Detection"
    await expect(page.getByRole('heading', { name: /conflict detection/i })).toBeVisible();
    // Check for page description
    await expect(page.getByText(/scheduling conflicts/i)).toBeVisible();
  });

  test('should show conflict summary cards', async ({ page }) => {
    // Check for summary cards (use .first() to avoid multiple matches)
    await expect(page.getByText(/total conflicts/i).first()).toBeVisible();
    await expect(page.getByText(/instructor conflicts/i).first()).toBeVisible();
    await expect(page.getByText(/room conflicts/i).first()).toBeVisible();
  });

  test('should display conflict count', async ({ page }) => {
    // There should be a number showing conflict count
    const totalCard = page.locator('[class*="card"]').filter({ hasText: /total conflicts/i });
    await expect(totalCard).toBeVisible();

    // Should show either a number or "No Conflicts Detected"
    const hasConflicts = await page.getByText(/no conflicts detected/i).isVisible();
    if (!hasConflicts) {
      // If there are conflicts, there should be conflict items
      const conflictItems = page.locator('[class*="card"][class*="border-l"]');
      await expect(conflictItems.first()).toBeVisible();
    }
  });

  test('should show conflict details when conflicts exist', async ({ page }) => {
    // Check if conflicts exist
    const noConflictsMessage = page.getByText(/no conflicts detected/i);

    if (!(await noConflictsMessage.isVisible())) {
      // If conflicts exist, check for conflict details
      const conflictCard = page.locator('[class*="card"]').filter({ hasText: /conflict/i }).first();
      await expect(conflictCard).toBeVisible();

      // Should show course information
      await expect(page.getByText(/cscd|cybr|math/i).first()).toBeVisible();
    }
  });

  test('should display success state when no conflicts', async ({ page }) => {
    const noConflictsMessage = page.getByText(/no conflicts detected/i);

    if (await noConflictsMessage.isVisible()) {
      // Should show success icon or green checkmark
      const successIcon = page.locator('[class*="text-green"], svg[class*="CheckCircle"]');
      await expect(successIcon.first()).toBeVisible();
    }
  });

  test('should categorize conflicts by type', async ({ page }) => {
    // Check that instructor and room conflict categories are displayed
    const instructorCard = page.locator('[class*="card"]').filter({ hasText: /instructor/i });
    const roomCard = page.locator('[class*="card"]').filter({ hasText: /room/i });

    await expect(instructorCard.first()).toBeVisible();
    await expect(roomCard.first()).toBeVisible();
  });
});
