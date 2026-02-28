import { test, expect } from '@playwright/test';
import { login, selectClient, TEST_CLIENT_NAME } from './helpers';

test.describe('Bulk Generation E2E', () => {
  test('bulk generate briefs from keywords', async ({ page }) => {
    // ============================================
    // STEP 1: Login & Select Client
    // ============================================
    await login(page);
    await selectClient(page, TEST_CLIENT_NAME);

    // ============================================
    // STEP 2: Click "Bulk Generate" button
    // ============================================
    const bulkBtn = page.getByRole('button', { name: /Bulk Generate/i });
    await expect(bulkBtn).toBeVisible({ timeout: 10_000 });
    await bulkBtn.click();

    // ============================================
    // STEP 3: Fill in keywords in the bulk modal
    // ============================================
    // Wait for modal to open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // Should be on "From Keywords" tab by default
    await expect(page.getByText(/From Keywords/i)).toBeVisible();

    // Fill keyword textarea (one brief per line, keywords comma-separated, pipe for volumes)
    const textarea = page.getByRole('dialog').locator('textarea').first();
    await textarea.fill('best content marketing tools 2026 | 1500\nseo audit checklist | 900');

    // Verify preview shows 2 briefs
    await expect(page.getByText(/2/).first()).toBeVisible({ timeout: 5_000 });

    // ============================================
    // STEP 4: Start the batch
    // ============================================
    const startBtn = page.getByRole('button', { name: /Start Batch/i });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 });

    // ============================================
    // STEP 5: Verify batch is running
    // ============================================
    // Should see a batch progress panel or toast notification
    // The BatchProgressPanel shows batch status
    await expect(
      page.getByText(/Batch|batch started|Generating|Analyzing/i).first()
    ).toBeVisible({ timeout: 30_000 });

    // ============================================
    // STEP 6: Wait for batch to complete
    // ============================================
    const maxWaitMs = 600_000; // 10 minutes
    const startTime = Date.now();
    let batchCompleted = false;

    while (Date.now() - startTime < maxWaitMs) {
      // Check for batch completion indicators
      const completedText = await page.getByText(/completed|Complete/i).count();
      const progressPanel = await page.locator('[class*="batch"], [class*="progress"]').count();

      // If no progress panel visible and we see completed briefs, batch is done
      if (completedText > 0 && progressPanel === 0) {
        batchCompleted = true;
        break;
      }

      // Log progress
      const statusText = await page.locator('[class*="batch"]').first().textContent().catch(() => '');
      if (statusText) {
        console.log(`Batch status: ${statusText}`);
      }

      await page.waitForTimeout(15_000); // Check every 15s
    }

    // ============================================
    // STEP 7: Verify briefs were created
    // ============================================
    // Refresh the brief list
    await page.reload();
    await expect(page.getByRole('button', { name: /New Brief/i })).toBeVisible({ timeout: 15_000 });

    // Check that the new briefs are visible (they should contain our keywords)
    const contentMarketingBrief = page.getByText(/content marketing tools/i).first();
    const seoAuditBrief = page.getByText(/seo audit checklist/i).first();

    const brief1Visible = await contentMarketingBrief.isVisible().catch(() => false);
    const brief2Visible = await seoAuditBrief.isVisible().catch(() => false);

    expect(brief1Visible || brief2Visible).toBeTruthy();

    console.log('Bulk generation E2E test PASSED');
  });

  test('bulk generate articles from selected briefs', async ({ page }) => {
    // ============================================
    // STEP 1: Login & Select Client
    // ============================================
    await login(page);
    await selectClient(page, TEST_CLIENT_NAME);

    // ============================================
    // STEP 2: Select completed briefs using checkboxes
    // ============================================
    // Find completed brief cards (emerald border) and click their checkboxes
    const briefCards = page.locator('[class*="border-l-emerald"]');
    const count = await briefCards.count();

    if (count < 1) {
      test.skip(true, 'No completed briefs available for bulk article generation');
      return;
    }

    // Select up to 2 completed briefs
    const selectCount = Math.min(count, 2);
    for (let i = 0; i < selectCount; i++) {
      const checkbox = briefCards.nth(i).locator('input[type="checkbox"], [role="checkbox"]').first();
      const checkboxVisible = await checkbox.isVisible().catch(() => false);
      if (checkboxVisible) {
        await checkbox.click();
      } else {
        // Try clicking the selection area (top-left corner of the card)
        await briefCards.nth(i).locator('[class*="checkbox"], [class*="select"]').first().click().catch(() => {
          console.log(`Could not select brief ${i}`);
        });
      }
    }

    // ============================================
    // STEP 3: Click "Generate (N)" button to open bulk modal for existing briefs
    // ============================================
    const generateSelectedBtn = page.getByRole('button', { name: /Generate \(\d+\)/i });
    const genBtnVisible = await generateSelectedBtn.isVisible().catch(() => false);

    if (!genBtnVisible) {
      test.skip(true, 'Could not select briefs for bulk generation');
      return;
    }

    await generateSelectedBtn.click();

    // ============================================
    // STEP 4: Select "Generate Article" in the modal
    // ============================================
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // Click "Generate Article" option
    await page.getByText('Generate Article').click();

    // Click Start Batch
    const startBtn = page.getByRole('button', { name: /Start Batch/i });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 });

    // ============================================
    // STEP 5: Verify batch started
    // ============================================
    await expect(
      page.getByText(/Batch|batch started|Generating/i).first()
    ).toBeVisible({ timeout: 30_000 });

    // ============================================
    // STEP 6: Wait for completion (articles take longer, up to 10 min each)
    // ============================================
    const maxWaitMs = 600_000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const batchPanelGone = await page.locator('[class*="batch-progress"]').count() === 0;
      if (batchPanelGone) break;

      await page.waitForTimeout(15_000);
    }

    console.log('Bulk article generation E2E test PASSED');
  });
});
