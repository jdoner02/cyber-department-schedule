import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(500);
  });

  test('should display settings page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Settings');
    await expect(page.getByText(/manage data|preferences/i)).toBeVisible();
  });

  test('should display data management section', async ({ page }) => {
    await expect(page.getByText(/data management/i)).toBeVisible();
    await expect(page.getByText(/current schedule data/i)).toBeVisible();
  });

  test('should show current data info', async ({ page }) => {
    // Check for data info
    await expect(page.getByText(/courses loaded/i)).toBeVisible();
    await expect(page.getByText(/data source/i)).toBeVisible();
    await expect(page.getByText(/last updated/i)).toBeVisible();
    await expect(page.getByText(/status/i)).toBeVisible();
  });

  test('should show import button', async ({ page }) => {
    const importButton = page.getByRole('button', { name: /import.*json/i });
    await expect(importButton).toBeVisible();
  });

  test('should show export button', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export all data/i });
    await expect(exportButton).toBeVisible();
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

  test('should display security section', async ({ page }) => {
    await expect(page.getByText('Security')).toBeVisible();
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
    await expect(page.getByText('Display')).toBeVisible();
    await expect(page.getByText(/color theme/i)).toBeVisible();
  });

  test('should show EWU brand colors', async ({ page }) => {
    await expect(page.getByText(/ewu.*brand.*colors/i)).toBeVisible();

    // Check for color swatches
    const redSwatch = page.locator('[class*="bg-ewu-red"]');
    await expect(redSwatch.first()).toBeVisible();
  });

  test('should display about section', async ({ page }) => {
    await expect(page.getByText('About')).toBeVisible();
    await expect(page.getByText(/ewu cyber schedule dashboard/i)).toBeVisible();
    await expect(page.getByText(/version/i)).toBeVisible();
  });

  test('should show schedule grid info', async ({ page }) => {
    await expect(page.getByText(/schedule grid/i)).toBeVisible();
    await expect(page.getByText(/hours displayed|7:00 am.*10:00 pm/i)).toBeVisible();
  });

  test('should display footer with copyright', async ({ page }) => {
    await expect(page.getByText(/eastern washington university/i)).toBeVisible();
    await expect(page.getByText(/all rights reserved/i)).toBeVisible();
  });
});
