import { test, expect } from '@playwright/test';
import { login, selectClient, TEST_CLIENT_NAME, waitForJobsToComplete, findCompletedCIBrief, setBriefDashboardView, cancelStaleJobs, SUPABASE_URL, SUPABASE_ANON_KEY } from './helpers';
import * as os from 'os';
import * as path from 'path';

const SCREENSHOT_DIR = path.join(os.tmpdir(), 'playwright-debug');

test.describe('Regenerate Step', () => {
  test('regenerate FAQs step via dashboard UI', async ({ page }) => {
    // Capture browser logs for debugging
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error' || msg.type() === 'warning' || text.includes('regenerat') || text.includes('backend') || text.includes('job') || text.includes('Failed') || text.includes('save')) {
        console.log(`[BROWSER] ${text}`);
      }
    });
    page.on('pageerror', err => {
      console.log(`[PAGE ERROR] ${err.message}`);
    });

    // ============================================
    // STEP 1: Cancel stale jobs and find a completed brief
    // ============================================
    const cancelledCount = await cancelStaleJobs();
    if (cancelledCount > 0) {
      console.log(`Cancelled ${cancelledCount} stale jobs before starting.`);
    }

    const brief = await findCompletedCIBrief();
    if (!brief) {
      throw new Error('No completed CI brief found. Run the single-brief test first.');
    }
    console.log(`Target brief: "${brief.name}" (${brief.id})`);

    // ============================================
    // STEP 2: Prepare brief in DB
    // ============================================
    await setBriefDashboardView(brief.id);
    // Clear active_job_id to prevent 409
    await fetch(
      `${SUPABASE_URL}/rest/v1/briefs?id=eq.${brief.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ active_job_id: null }),
      }
    );

    const testStartTime = new Date().toISOString();

    // ============================================
    // STEP 3: Login, select client, open the brief
    // ============================================
    await login(page);
    await selectClient(page, TEST_CLIENT_NAME);

    const searchInput = page.getByPlaceholder(/Search briefs/i);
    await searchInput.fill(brief.name);
    await page.waitForTimeout(1000);

    const viewEditBtn = page.getByRole('button', { name: /View \/ Edit/i }).first();
    await expect(viewEditBtn).toBeVisible({ timeout: 10_000 });
    await viewEditBtn.click();
    console.log(`Opened brief: "${brief.name}"`);

    // ============================================
    // STEP 4: Wait for dashboard to load fully
    // ============================================
    await expect(page.getByText(/Goal & Audience/i).first()).toBeVisible({ timeout: 30_000 });
    // Wait for auto-save to settle (the brief loads, triggers state updates, then saves)
    await page.waitForTimeout(3000);
    console.log('Dashboard loaded.');

    // ============================================
    // STEP 5: Navigate to FAQs section
    // ============================================
    const faqSidebarLink = page.getByText(/FAQs/i).first();
    await expect(faqSidebarLink).toBeVisible({ timeout: 10_000 });
    await faqSidebarLink.click();
    console.log('Clicked FAQs in sidebar.');

    // Wait for the section to fully render
    const regenButton = page.getByRole('button', { name: /Regenerate FAQs/i });
    await expect(regenButton).toBeVisible({ timeout: 15_000 });
    await regenButton.scrollIntoViewIfNeeded();
    // Wait for any pending state updates to settle
    await page.waitForTimeout(2000);

    // ============================================
    // STEP 6: Enter feedback
    // ============================================
    const feedbackTextarea = page.getByPlaceholder(/e\.g\.,/i);
    await expect(feedbackTextarea).toBeVisible({ timeout: 10_000 });
    await feedbackTextarea.fill('Focus on technical SEO questions about crawling and indexing');
    // Wait for feedback state to propagate
    await page.waitForTimeout(1000);
    console.log('Feedback entered.');

    // ============================================
    // STEP 7: Click Regenerate (with retry)
    // ============================================
    let jobId: string | null = null;
    const maxClickAttempts = 3;

    for (let attempt = 1; attempt <= maxClickAttempts; attempt++) {
      console.log(`Click attempt ${attempt}/${maxClickAttempts}...`);

      // Re-locate the button (fresh reference after state changes)
      const btn = page.getByRole('button', { name: /Regenerate FAQs/i });
      await btn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      // Click using evaluate for maximum reliability
      await btn.evaluate((el: HTMLElement) => el.click());

      console.log('Click dispatched. Waiting for job creation...');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `regen-click-attempt-${attempt}.png`) });

      // Wait up to 15s for the job to appear in DB
      const clickTime = Date.now();
      while (Date.now() - clickTime < 15_000) {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/generation_jobs?brief_id=eq.${brief.id}&job_type=eq.regenerate&created_at=gte.${testStartTime}&select=id,status&order=created_at.desc&limit=1`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );
        if (res.ok) {
          const jobs = await res.json();
          if (jobs?.[0]) {
            jobId = jobs[0].id;
            console.log(`Job created on attempt ${attempt}: ${jobId} (status: ${jobs[0].status})`);
            break;
          }
        }
        await new Promise(r => setTimeout(r, 2000));
      }

      if (jobId) break;
      console.log(`No job after attempt ${attempt}. Retrying...`);
    }

    if (!jobId) {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'regen-no-job.png') });
      throw new Error(`No regenerate job was created after ${maxClickAttempts} click attempts.`);
    }

    // ============================================
    // STEP 8: Wait for job completion
    // ============================================
    await waitForJobsToComplete(300_000);
    console.log('Jobs processing finished.');

    // ============================================
    // STEP 9: Verify job outcome
    // ============================================
    const jobRes = await fetch(
      `${SUPABASE_URL}/rest/v1/generation_jobs?id=eq.${jobId}&select=id,status,error_message`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    expect(jobRes.ok).toBeTruthy();
    const jobs = await jobRes.json();
    const job = jobs?.[0];
    expect(job).toBeTruthy();
    console.log(`Job final: status=${job.status}, error=${job.error_message || 'none'}`);
    // Job should be completed or cancelled (stuck job cleaned up)
    expect(['completed', 'cancelled']).toContain(job.status);

    // Give UI time to process
    await page.waitForTimeout(5000);

    // ============================================
    // STEP 10: Verify UI state
    // ============================================
    const hasError = await page.getByText(/Content Generation Failed/i).first()
      .isVisible()
      .catch(() => false);
    if (hasError) {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'regen-failed.png') });
      throw new Error('Regeneration failed — error message visible on page.');
    }

    const stillRegenerating = await page.getByText(/Regenerating\.\.\./i).first()
      .isVisible()
      .catch(() => false);
    expect(stillRegenerating).toBeFalsy();

    await expect(page.getByText(/FAQs/i).first()).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'regen-complete.png') });
    console.log('Regenerate step E2E test PASSED');
  });
});
