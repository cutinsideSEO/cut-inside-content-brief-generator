import { test, expect } from '@playwright/test';
import { login, selectClient, TEST_CLIENT_NAME, waitForJobsToComplete, SUPABASE_URL, SUPABASE_ANON_KEY } from './helpers';
import * as os from 'os';
import * as path from 'path';

// Use OS temp dir for debug screenshots to avoid triggering Vite HMR
const SCREENSHOT_DIR = path.join(os.tmpdir(), 'playwright-debug');

/**
 * Find the most recent completed brief for the CI client that has all 7 steps.
 */
async function findCompletedCIBrief(): Promise<{ id: string; name: string } | null> {
  // Find CI client
  const clientRes = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?select=id,name&limit=10`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );
  if (!clientRes.ok) return null;
  const clients = await clientRes.json();
  const ciClient = clients.find((c: any) => c.name === 'CI' || c.name.startsWith('CI'));
  if (!ciClient) return null;

  // Find most recent completed brief with on_page_seo (step 7 done)
  const briefRes = await fetch(
    `${SUPABASE_URL}/rest/v1/briefs?client_id=eq.${ciClient.id}&status=eq.complete&select=id,name,current_view,brief_data&order=updated_at.desc&limit=5`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );
  if (!briefRes.ok) return null;
  const briefs = await briefRes.json();
  const target = briefs.find((b: any) => b.brief_data?.on_page_seo) || briefs[0];
  return target ? { id: target.id, name: target.name } : null;
}

/**
 * Force a brief's current_view to 'dashboard' via direct DB update.
 */
async function setBriefDashboardView(briefId: string): Promise<void> {
  await fetch(
    `${SUPABASE_URL}/rest/v1/briefs?id=eq.${briefId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ current_view: 'dashboard' }),
    }
  );
}

test.describe('Article Generation', () => {
  test('generate article from a completed brief', async ({ page }) => {
    // Debug logging
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });
    page.on('pageerror', err => {
      console.log(`[PAGE ERROR] ${err.message}`);
    });

    // ============================================
    // STEP 1: Find a completed brief
    // ============================================
    const brief = await findCompletedCIBrief();
    if (!brief) {
      throw new Error('No completed CI brief found. Run the single-brief test first.');
    }
    console.log(`Target brief: "${brief.name}" (${brief.id})`);

    // ============================================
    // STEP 2: Set dashboard view in DB before opening
    // ============================================
    await setBriefDashboardView(brief.id);

    // ============================================
    // STEP 3: Login, select client, open the brief
    // ============================================
    await login(page);
    await selectClient(page, TEST_CLIENT_NAME);

    // Search and click the brief
    const searchInput = page.getByPlaceholder(/Search briefs/i);
    await searchInput.fill(brief.name);
    await page.waitForTimeout(1000);

    const viewEditBtn = page.getByRole('button', { name: /View \/ Edit/i }).first();
    await expect(viewEditBtn).toBeVisible({ timeout: 10_000 });
    await viewEditBtn.click();
    console.log(`Opened brief: "${brief.name}"`);

    // ============================================
    // STEP 4: Wait for dashboard to load
    // ============================================
    const generateBtn = page.getByRole('button', { name: /Generate Full Article/i });
    await expect(generateBtn).toBeVisible({ timeout: 30_000 });

    console.log('Dashboard loaded. "Generate Full Article" button is visible.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'article-dashboard.png') });

    // ============================================
    // STEP 5: Click "Generate Full Article" and confirm
    // ============================================
    await generateBtn.click();

    const confirmBtn = page.getByRole('button', { name: /^Generate Article$/i });
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
    await confirmBtn.click();

    console.log('Confirmed article generation. Waiting for generation to start...');

    // ============================================
    // STEP 6: Wait for article generation to start
    // ============================================
    await expect(
      page.getByText(/AI is Writing Your Article|Section \d+ of \d+/i).first()
    ).toBeVisible({ timeout: 60_000 });

    console.log('Article generation started.');

    // ============================================
    // STEP 7: Wait for article generation to complete
    // ============================================
    await waitForJobsToComplete(600_000);

    console.log('Backend article job completed. Waiting for UI...');
    await page.waitForTimeout(8000);

    // ============================================
    // STEP 8: Verify article was generated
    // ============================================
    const maxWaitMs = 30_000;
    const startTime = Date.now();
    let articleFound = false;

    while (Date.now() - startTime < maxWaitMs) {
      const checks = await Promise.all([
        page.getByText(/Strategy Deployed/i).first().isVisible().catch(() => false),
        page.getByText(/Generated Article/i).first().isVisible().catch(() => false),
        page.getByText(/\d+.*words$/i).first().isVisible().catch(() => false),
        page.getByRole('button', { name: /Copy for Docs/i }).first().isVisible().catch(() => false),
        page.getByRole('button', { name: /Download/i }).first().isVisible().catch(() => false),
      ]);

      if (checks.some(Boolean)) {
        const labels = ['Strategy Deployed', 'Generated Article', 'words', 'Copy for Docs', 'Download'];
        console.log(`Article indicators: ${labels.filter((_, i) => checks[i]).join(', ')}`);
        articleFound = true;
        break;
      }

      const hasError = await page.getByText(/Content Generation Failed/i).first().isVisible().catch(() => false);
      if (hasError) {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'article-generation-failed.png') });
        throw new Error('Article generation failed!');
      }

      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'article-complete.png') });
    expect(articleFound).toBeTruthy();

    console.log('Article generation E2E test PASSED');
  });
});
