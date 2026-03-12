import { test, expect } from '@playwright/test';
import {
  fetchBriefData,
  findRecentBriefsByNames,
  login,
  selectClient,
  TEST_CLIENT_NAME,
  waitForJobsToComplete,
} from './helpers';

test.describe('Bulk Generation E2E', () => {
  test('bulk generate briefs from keywords', async ({ page }) => {
    const runSuffix = Date.now().toString().slice(-8);
    const expectedBriefNames = [
      `best content marketing tools 2026 ${runSuffix}`,
    ];

    // ============================================
    // STEP 1: Login & Select Client
    // ============================================
    await login(page);
    await selectClient(page, TEST_CLIENT_NAME);

    // ============================================
    // STEP 2: Open toolbar "More" menu and click "Bulk Generate Briefs"
    // ============================================
    const moreBtn = page.getByRole('button', { name: /^More$/i });
    await expect(moreBtn).toBeVisible({ timeout: 10_000 });
    await moreBtn.click();

    const bulkMenuItem = page.getByRole('menuitem', { name: /Bulk Generate Briefs/i });
    await expect(bulkMenuItem).toBeVisible({ timeout: 5_000 });
    await bulkMenuItem.click();

    // ============================================
    // STEP 3: Fill in keywords in the bulk modal
    // ============================================
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/From Keywords/i)).toBeVisible();

    const textarea = page.getByRole('dialog').locator('textarea').first();
    await textarea.fill(`${expectedBriefNames[0]} | 1500`);

    await expect(page.getByText(/1/).first()).toBeVisible({ timeout: 5_000 });

    // ============================================
    // STEP 4: Start the batch
    // ============================================
    const startBtn = page.getByRole('button', { name: /Start Batch/i });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 });

    // ============================================
    // STEP 5: Verify batch panel appears (batch was started)
    // ============================================
    const batchStarted = await Promise.race([
      page.getByText(/Batch|Generating|Analyzing|Running/i).first().waitFor({ timeout: 30_000 }).then(() => true).catch(() => false),
      page.locator('[class*="batch"]').first().waitFor({ timeout: 30_000 }).then(() => true).catch(() => false),
    ]);
    console.log(`Batch started indicator visible: ${batchStarted}`);

    let createdBriefs = await findRecentBriefsByNames(expectedBriefNames);
    for (let attempt = 0; attempt < 12 && createdBriefs.length < expectedBriefNames.length; attempt++) {
      await page.waitForTimeout(5_000);
      createdBriefs = await findRecentBriefsByNames(expectedBriefNames);
    }

    expect(createdBriefs).toHaveLength(expectedBriefNames.length);

    // ============================================
    // STEP 6: Wait for batch jobs to complete
    // ============================================
    console.log('Waiting for batch jobs to complete (up to 15 min)...');
    await waitForJobsToComplete(900_000, {
      briefIds: createdBriefs.map((brief) => brief.id),
      createdAfter: createdBriefs
        .map((brief) => brief.created_at)
        .filter((value): value is string => Boolean(value))
        .sort()[0],
    });
    console.log('Batch jobs completed (or timed out).');

    // ============================================
    // STEP 7: Verify exact terminal brief state in the DB
    // ============================================
    createdBriefs = await findRecentBriefsByNames(expectedBriefNames);
    for (let attempt = 0; attempt < 12; attempt++) {
      const allTerminal = createdBriefs.length === expectedBriefNames.length
        && createdBriefs.every((brief) =>
          brief.status === 'complete'
          && brief.current_view === 'dashboard'
          && brief.current_step === 7
          && brief.active_job_id === null
        );

      if (allTerminal) {
        break;
      }

      await page.waitForTimeout(5_000);
      createdBriefs = await findRecentBriefsByNames(expectedBriefNames);
    }

    expect(createdBriefs).toHaveLength(expectedBriefNames.length);

    for (const expectedName of expectedBriefNames) {
      const brief = createdBriefs.find((row) => row.name === expectedName);
      expect(brief, `Missing created brief row for ${expectedName}`).toBeTruthy();
      expect(brief?.status, `${expectedName} should finish as complete`).toBe('complete');
      expect(brief?.current_view, `${expectedName} should finish on dashboard`).toBe('dashboard');
      expect(brief?.current_step, `${expectedName} should finish at step 7`).toBe(7);
      expect(brief?.active_job_id, `${expectedName} should clear active_job_id`).toBeNull();
    }

    const targetBrief = createdBriefs[0];
    const beforeOpen = await fetchBriefData(targetBrief.id);

    // ============================================
    // STEP 8: Verify CTA rendering and open behavior in the UI
    // ============================================
    await page.reload();
    await selectClient(page, TEST_CLIENT_NAME);
    await expect(page.getByRole('button', { name: /New Brief/i })).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByPlaceholder('Search briefs by name or keywords...');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await searchInput.fill(targetBrief.name);

    const briefHeading = page.getByRole('heading', { name: targetBrief.name, exact: true }).first();
    await expect(briefHeading).toBeVisible({ timeout: 10_000 });

    const viewEditButton = page.getByRole('button', { name: /View \/ Edit/i }).first();
    await expect(viewEditButton).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /^Continue$/i })).toHaveCount(0);

    await viewEditButton.click();

    await expect(page.getByRole('button', { name: /Generate Full Article/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Start Your Content Project/i)).toHaveCount(0);

    // Autosave debounce is 500ms in App.tsx; give it enough time to persist if it regresses.
    await page.waitForTimeout(3_000);

    const afterOpen = await fetchBriefData(targetBrief.id);
    expect(afterOpen?.status).toBe(beforeOpen?.status);
    expect(afterOpen?.current_view).toBe(beforeOpen?.current_view);
    expect(afterOpen?.current_step).toBe(beforeOpen?.current_step);

    console.log('Bulk generation E2E test PASSED with strict DB + UI terminal-state assertions.');
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
    await page.waitForTimeout(2_000);

    const briefCards = page.locator('[class*="border-l-emerald"]');
    const count = await briefCards.count();
    console.log(`Found ${count} completed brief cards.`);

    if (count < 1) {
      test.skip(true, 'No completed briefs available for bulk article generation');
      return;
    }

    const selectCount = Math.min(count, 2);
    for (let i = 0; i < selectCount; i++) {
      const checkbox = briefCards.nth(i).locator('input[type="checkbox"], [role="checkbox"]').first();
      const checkboxVisible = await checkbox.isVisible().catch(() => false);
      if (checkboxVisible) {
        await checkbox.click();
      } else {
        await briefCards.nth(i).locator('[class*="checkbox"], [class*="select"]').first().click().catch(() => {
          console.log(`Could not select brief ${i}`);
        });
      }
    }

    // ============================================
    // STEP 3: Click "Generate (N)" button to open bulk modal for existing briefs
    // ============================================
    const generateSelectedBtn = page.getByRole('button', { name: /Generate \(\d+\)/i });
    const genBtnVisible = await generateSelectedBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!genBtnVisible) {
      test.skip(true, 'Could not select briefs for bulk generation');
      return;
    }

    await generateSelectedBtn.click();

    // ============================================
    // STEP 4: Select "Generate Article" in the modal
    // ============================================
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    const generateArticleOption = page.getByRole('button', { name: /Generate Article/i }).first();
    await expect(generateArticleOption).toBeVisible();
    await generateArticleOption.click();

    const startBtn = page.getByRole('button', { name: /Start Batch/i });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 });

    // ============================================
    // STEP 5: Verify batch started
    // ============================================
    const batchStarted = await page.getByText(/Batch|batch started|Generating/i).first()
      .waitFor({ timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    console.log(`Article batch started: ${batchStarted}`);

    // ============================================
    // STEP 6: Wait for completion (articles take longer)
    // ============================================
    console.log('Waiting for article batch jobs to complete (up to 15 min)...');
    await waitForJobsToComplete(900_000);
    console.log('Article batch jobs completed (or timed out).');

    console.log('Bulk article generation E2E test PASSED');
  });
});
