import { test, expect } from '@playwright/test';

test.describe('Documentation Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/docs');
    await page.waitForTimeout(500);
  });

  test('should display documentation hub', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Documentation');
    await expect(page.getByText(/security.*documentation|policies/i)).toBeVisible();
  });

  test('should display section navigation', async ({ page }) => {
    // Check for documentation sections
    await expect(page.getByRole('button', { name: /threat model/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /ferpa/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /program/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /templates/i })).toBeVisible();
  });

  test('should display threat model section by default', async ({ page }) => {
    // Threat model should be the default section
    await expect(page.getByText(/system overview|threat analysis/i).first()).toBeVisible();
  });

  test('should navigate to FERPA section', async ({ page }) => {
    await page.getByRole('button', { name: /ferpa/i }).click();

    await expect(page.getByText(/family educational rights/i)).toBeVisible();
    await expect(page.getByText(/protected information/i)).toBeVisible();
  });

  test('should navigate to Program Info section', async ({ page }) => {
    await page.getByRole('button', { name: /program/i }).click();

    await expect(page.getByText(/cybersecurity program/i)).toBeVisible();
    await expect(page.getByText(/degree programs/i)).toBeVisible();
  });

  test('should navigate to Templates section', async ({ page }) => {
    await page.getByRole('button', { name: /templates/i }).click();

    await expect(page.getByText(/executive.*briefing/i)).toBeVisible();
    await expect(page.getByText(/quarterly.*report|capacity.*planning/i).first()).toBeVisible();
  });

  test('should display data classification table in threat model', async ({ page }) => {
    // Should show PUBLIC, INTERNAL, CONFIDENTIAL classifications
    await expect(page.getByText('PUBLIC').first()).toBeVisible();
    await expect(page.getByText('INTERNAL').first()).toBeVisible();
    await expect(page.getByText('CONFIDENTIAL').first()).toBeVisible();
  });

  test('should show security controls in threat model', async ({ page }) => {
    // Check for security control descriptions
    await expect(page.getByText(/encryption|aes.*gcm/i).first()).toBeVisible();
    await expect(page.getByText(/pbkdf2|key derivation/i).first()).toBeVisible();
  });

  test('should display FERPA compliance guidelines', async ({ page }) => {
    await page.getByRole('button', { name: /ferpa/i }).click();

    // Check for compliance sections
    await expect(page.getByText(/how this dashboard complies/i)).toBeVisible();
    await expect(page.getByText(/no server storage/i)).toBeVisible();
    await expect(page.getByText(/encryption at rest/i)).toBeVisible();
  });

  test('should show program contact information', async ({ page }) => {
    await page.getByRole('button', { name: /program/i }).click();

    // Check for contact info
    await expect(page.getByText(/eastern washington university/i)).toBeVisible();
    await expect(page.getByText(/department.*computer science/i)).toBeVisible();
  });

  test('should have external link to EWU website', async ({ page }) => {
    await page.getByRole('button', { name: /program/i }).click();

    // Check for external link
    const externalLink = page.getByRole('link', { name: /visit.*website/i });
    await expect(externalLink).toBeVisible();
    await expect(externalLink).toHaveAttribute('target', '_blank');
  });

  test('should display briefing template cards', async ({ page }) => {
    await page.getByRole('button', { name: /templates/i }).click();

    // Check for template cards
    await expect(page.getByText(/quarterly schedule report/i)).toBeVisible();
    await expect(page.getByText(/capacity planning brief/i)).toBeVisible();
    await expect(page.getByText(/faculty workload summary/i)).toBeVisible();
    await expect(page.getByText(/program health dashboard/i)).toBeVisible();
  });
});
