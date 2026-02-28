import { test, expect } from '@playwright/test';
import { login, selectClient, TEST_CLIENT_NAME, waitForJobsToComplete } from './helpers';
import * as os from 'os';
import * as path from 'path';

// Use OS temp dir for debug screenshots to avoid triggering Vite HMR
const SCREENSHOT_DIR = path.join(os.tmpdir(), 'playwright-debug');

test.describe('Single Brief Creation E2E', () => {
  test('create a brief from keywords and generate full brief', async ({ page }) => {
    // Debug: capture console errors, page errors, and navigation events
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });
    page.on('pageerror', err => {
      console.log(`[PAGE ERROR] ${err.message}`);
    });
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        console.log(`[NAVIGATION] Page navigated to: ${frame.url()}`);
      }
    });

    // ============================================
    // STEP 1: Login
    // ============================================
    await login(page);

    // ============================================
    // STEP 2: Select client
    // ============================================
    await selectClient(page, TEST_CLIENT_NAME);

    // ============================================
    // STEP 3: Click "New Brief" to create a brief
    // ============================================
    await page.getByRole('button', { name: /New Brief/i }).click();

    // Wait for initial input screen
    await expect(page.getByText(/Start Your Content Project/i)).toBeVisible({ timeout: 10_000 });

    // ============================================
    // STEP 4: Select "Create New Brief" flow
    // ============================================
    await page.getByText('Create New Brief').click();

    // Wait for keyword input screen
    await expect(page.getByText(/What keywords should we target/i)).toBeVisible({ timeout: 10_000 });

    // ============================================
    // STEP 5: Switch to Manual Input and enter keywords
    // ============================================
    await page.getByRole('tab', { name: /Manual Input/i }).click();

    // Fill first keyword row
    const keywordInputs = page.locator('input[placeholder="Enter keyword..."]');
    const volumeInputs = page.locator('input[placeholder="0"]');

    await keywordInputs.first().fill('best seo strategy 2026');
    await volumeInputs.first().fill('1200');

    // Add second keyword
    await page.getByText('+ Add Keyword').click();
    await keywordInputs.nth(1).fill('seo tips for beginners');
    await volumeInputs.nth(1).fill('800');

    // Click Next to go to settings
    await page.getByRole('button', { name: /Next/i }).click();

    // ============================================
    // STEP 6: Configure settings (Step 2 of setup — Country/Language)
    // ============================================
    await expect(page.getByText(/Where are your readers/i)).toBeVisible({ timeout: 10_000 });

    // Country, language defaults are fine (United States, English, English)
    // Click Next to go to step 3 (fine-tune)
    await page.getByRole('button', { name: /Next/i }).click();

    // ============================================
    // STEP 6b: Fine-tune settings (Step 3 of setup)
    // ============================================
    await expect(page.getByText(/Fine-tune your brief/i)).toBeVisible({ timeout: 10_000 });

    // Default settings are fine — click Start Analysis
    await page.getByRole('button', { name: /Start Analysis/i }).click();

    // ============================================
    // STEP 7: Context Input Screen — wait for competitors to finish
    // ============================================
    // In Supabase mode, competitor analysis runs via backend job queue.
    // "Add context" heading appears immediately (isLoading goes false after job creation).
    await expect(page.getByText(/Add context/i)).toBeVisible({ timeout: 30_000 });

    console.log('Context input screen loaded. Waiting for competitor analysis to complete...');

    // Poll the Supabase DB directly to wait for the competitors job to complete.
    // The UI progress card may appear and disappear too quickly to catch reliably.
    // This also handles stuck jobs (phase=complete but status still 'running')
    // by cancelling them, which unblocks creating the full_brief job.
    await waitForJobsToComplete(300_000);

    console.log('All jobs completed or cleaned up.');

    // Wait for Realtime to propagate any cancellations to the frontend
    await page.waitForTimeout(3000);

    // Click Continue to proceed to competition visualization
    await page.getByRole('button', { name: /Continue/i }).click();

    // ============================================
    // STEP 8: Competition Viz — Continue to Brief Creation (frontend generation)
    // ============================================
    await expect(page.getByText(/Competitive Landscape/i)).toBeVisible({ timeout: 30_000 });

    console.log('On competition viz screen. Clicking Continue to Brief Creation...');

    await page.getByRole('button', { name: /Continue to Brief Creation/i }).click();

    // ============================================
    // STEP 9: Brief Generation (Steps 1-7 via frontend Gemini proxy)
    // ============================================
    // Frontend generates each step sequentially via callGemini → gemini-proxy EF.
    // Each step: isLoading=true → ThemedLoader → Gemini call → isLoading=false → Accept button.
    // After all stale jobs were cancelled, no backend job interferes.

    console.log('Starting frontend brief generation (7 steps)...');

    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'step9-start.png') });

    // Navigate through all 7 steps
    for (let step = 1; step <= 7; step++) {
      console.log(`Waiting for Step ${step}/7...`);

      // Wait for current step badge to appear
      await expect(page.getByText(new RegExp(`Step ${step}/7`, 'i')).first()).toBeVisible({ timeout: 180_000 });

      // Wait for step content to finish generating (Accept button becomes visible)
      // Each Gemini call via proxy typically takes 10-40s. Retry mechanism: 3 × 60s.
      if (step < 7) {
        const acceptBtn = page.getByRole('button', { name: /Accept & Continue/i });
        await expect(acceptBtn).toBeVisible({ timeout: 300_000 });
        await acceptBtn.click();
        console.log(`Step ${step} accepted.`);
      } else {
        // Step 7 — final step
        const finishBtn = page.getByRole('button', { name: /Accept & View Dashboard/i });
        await expect(finishBtn).toBeVisible({ timeout: 300_000 });
        await finishBtn.click();
        console.log('Step 7 accepted — viewing dashboard.');
      }
    }

    // ============================================
    // STEP 10: Dashboard - Verify brief completion
    // ============================================
    // Dashboard shows step names in the sidebar, not "Step 1" etc.
    const stepNames = ['Goal & Audience', 'Competitive Analysis', 'Keyword Strategy', 'Content Gaps', 'Structure', 'FAQs', 'On-Page SEO'];
    for (const name of stepNames) {
      await expect(page.getByText(new RegExp(name, 'i')).first()).toBeVisible({ timeout: 30_000 });
    }

    console.log('Single brief creation E2E test PASSED');
  });
});
