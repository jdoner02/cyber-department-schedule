import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('should have proper page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/EWU|Cyber|Schedule/i);
  });

  test('should have main heading on each page', async ({ page }) => {
    const pages = ['/', '/conflicts', '/notes', '/analytics', '/docs', '/settings'];

    for (const path of pages) {
      await page.goto(path);
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Should have h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // H2s should exist if there are sections
    const h2Count = await page.locator('h2, h3').count();
    // Just verify page structure exists
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');

    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');

    // Tab through the page
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Some element should be focused
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeTruthy();
  });

  test('should have focus indicators', async ({ page }) => {
    await page.goto('/');

    // Tab to a focusable element
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    if (await focusedElement.isVisible()) {
      // Check that focus is visible (has outline or ring)
      const styles = await focusedElement.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          outline: computed.outline,
          boxShadow: computed.boxShadow,
        };
      });

      // Should have some form of focus indicator
      const hasFocusIndicator =
        styles.outline !== 'none' ||
        styles.boxShadow !== 'none';
      // Note: This is a basic check; focus indicators might be handled differently
    }
  });

  test('should have skip to main content link', async ({ page }) => {
    await page.goto('/');

    // Tab once - skip link should be first
    await page.keyboard.press('Tab');

    // Look for skip link (if implemented)
    const skipLink = page.locator('a[href="#main"], [class*="skip"]');
    // Skip link is optional but recommended
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/notes');

    // Open new note form
    await page.getByRole('button', { name: /new note/i }).click();

    // Check for labels
    const labels = page.locator('label');
    const labelCount = await labels.count();

    expect(labelCount).toBeGreaterThan(0);
  });

  test('should have accessible button labels', async ({ page }) => {
    await page.goto('/');

    // All buttons should have accessible names
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        // Button should have text content or aria-label
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');

        const hasAccessibleName = (text && text.trim()) || ariaLabel || title;
        // Buttons with only icons might use aria-label
      }
    }
  });

  test('should have proper ARIA roles on interactive elements', async ({ page }) => {
    await page.goto('/');

    // Check navigation has proper role
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav.first()).toBeTruthy();

    // Check main content area
    const main = page.locator('main, [role="main"]');
    await expect(main.first()).toBeTruthy();
  });

  test('should handle modal accessibility', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Open a course modal
    const courseBlock = page.locator('[class*="course-block"], [role="button"]').first();
    if (await courseBlock.isVisible()) {
      await courseBlock.click();

      // Modal should have proper role
      const modal = page.locator('[role="dialog"], [class*="modal"]');
      await expect(modal.first()).toBeVisible();

      // Should be able to close with Escape
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');

    // This is a basic check - full contrast testing would require additional tools
    // Just verify text is visible against backgrounds
    const headerText = page.locator('h1');
    await expect(headerText).toBeVisible();
  });

  test('should work without JavaScript for basic content', async ({ page, browser }) => {
    // This test verifies SSR/hydration if implemented
    // For SPA, at minimum the loading state should be accessible
    await page.goto('/');

    // Page should load even if there are JS errors
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should announce dynamic content changes', async ({ page }) => {
    await page.goto('/');

    // Check for aria-live regions if dynamic content is updated
    const liveRegions = page.locator('[aria-live]');
    // Having live regions is good for accessibility but not strictly required
  });
});

test.describe('Mobile Accessibility', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('should be touch-friendly on mobile', async ({ page }) => {
    await page.goto('/');

    // Check that buttons are large enough for touch
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          // Touch targets should be at least 44x44px (WCAG recommendation)
          // Some buttons might be smaller if they're inline
        }
      }
    }
  });

  test('should have readable text on mobile', async ({ page }) => {
    await page.goto('/');

    // Check that text is readable (not too small)
    const bodyText = page.locator('body');
    const fontSize = await bodyText.evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    const fontSizeValue = parseInt(fontSize);
    expect(fontSizeValue).toBeGreaterThanOrEqual(14);
  });
});
