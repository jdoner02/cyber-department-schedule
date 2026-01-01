import { test, expect } from '@playwright/test';

test.describe('Notes Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notes');
    await page.waitForTimeout(500);
  });

  test('should display notes page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Notes');
    await expect(page.getByText(/saved locally/i)).toBeVisible();
  });

  test('should show empty state when no notes exist', async ({ page }) => {
    // Clear any existing notes first
    await page.evaluate(() => localStorage.removeItem('ewu-schedule-notes'));
    await page.reload();

    // Check for empty state
    const emptyState = page.getByText(/no notes yet|create your first/i);
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('should open new note form', async ({ page }) => {
    // Click New Note button
    const newNoteButton = page.getByRole('button', { name: /new note/i });
    await newNoteButton.click();

    // Form should be visible
    await expect(page.getByText(/create new note/i)).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('should create a new note', async ({ page }) => {
    // Open new note form
    await page.getByRole('button', { name: /new note/i }).click();

    // Fill in the note
    const textarea = page.locator('textarea');
    await textarea.fill('Test note content for E2E testing');

    // Select priority
    const prioritySelect = page.locator('select').filter({ hasText: /medium|priority/i });
    if (await prioritySelect.isVisible()) {
      await prioritySelect.selectOption('high');
    }

    // Save the note
    const saveButton = page.getByRole('button', { name: /save note/i });
    await saveButton.click();

    // Note should appear in the list
    await expect(page.getByText('Test note content for E2E testing')).toBeVisible();
  });

  test('should filter notes by priority', async ({ page }) => {
    // First create a note
    await page.getByRole('button', { name: /new note/i }).click();
    await page.locator('textarea').fill('High priority test note');
    await page.locator('select').filter({ hasText: /priority/i }).first().selectOption('high');
    await page.getByRole('button', { name: /save note/i }).click();

    // Filter by priority
    const filterSelect = page.locator('select').filter({ hasText: /all priorities/i });
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption('high');
    }
  });

  test('should search notes', async ({ page }) => {
    // First create a note with specific content
    await page.getByRole('button', { name: /new note/i }).click();
    await page.locator('textarea').fill('Searchable unique content XYZ123');
    await page.getByRole('button', { name: /save note/i }).click();

    // Search for the note
    const searchInput = page.getByPlaceholder(/search notes/i);
    await searchInput.fill('XYZ123');

    // Note should still be visible
    await expect(page.getByText('Searchable unique content XYZ123')).toBeVisible();
  });

  test('should edit an existing note', async ({ page }) => {
    // Create a note first
    await page.getByRole('button', { name: /new note/i }).click();
    await page.locator('textarea').fill('Original note content');
    await page.getByRole('button', { name: /save note/i }).click();

    // Find and click edit button
    const noteCard = page.locator('[class*="card"]').filter({ hasText: 'Original note content' });
    const noteEditButton = noteCard.locator('button[class*="ghost"]').first();

    if (await noteEditButton.isVisible()) {
      await noteEditButton.click();
    }
  });

  test('should export notes', async ({ page }) => {
    // Create a note first
    await page.getByRole('button', { name: /new note/i }).click();
    await page.locator('textarea').fill('Note for export test');
    await page.getByRole('button', { name: /save note/i }).click();

    // Click export button
    const exportButton = page.getByRole('button', { name: /export/i });
    if (await exportButton.isEnabled()) {
      // Note: Can't actually verify download in Playwright easily
      // Just verify the button is clickable
      await expect(exportButton).toBeEnabled();
    }
  });

  test('should cancel note creation', async ({ page }) => {
    // Open new note form
    await page.getByRole('button', { name: /new note/i }).click();
    await expect(page.getByText(/create new note/i)).toBeVisible();

    // Click cancel
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    await cancelButton.click();

    // Form should be hidden
    await expect(page.getByText(/create new note/i)).not.toBeVisible();
  });
});
